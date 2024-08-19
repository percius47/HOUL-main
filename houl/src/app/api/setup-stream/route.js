import AWS from "aws-sdk";

AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
});

const medialive = new AWS.MediaLive();
const mediapackage = new AWS.MediaPackage();

// This function will handle POST requests to this API route
export async function POST(req) {
  try {
    const { userId } = await req.json();

    // Step 1: Create MediaLive Input
    const mediaLiveInput = await createMediaLiveInput(userId);

    // Step 2: Create MediaPackage Channel
    const mediaPackageChannel = await createMediaPackageChannel(userId);

    // Step 3: Create MediaLive Channel
    const mediaLiveChannel = await createMediaLiveChannel(
      mediaLiveInput.Id,
      mediaPackageChannel.Id
    );

    // Step 4: Create MediaPackage Endpoints
    const { hlsEndpoint, dashEndpoint } = await createMediaPackageEndpoints(
      mediaPackageChannel.Id
    );

    return new Response(
      JSON.stringify({
        inputEndpoints: mediaLiveInput.Destinations,
        hlsUrl: hlsEndpoint.Url,
        dashUrl: dashEndpoint.Url,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error setting up stream:", err);
    return new Response(
      JSON.stringify({
        message: "Error setting up stream",
        error: err.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Helper functions to interact with AWS services
async function createMediaLiveInput(userId) {
  // First, create an Input Security Group
  const securityGroupParams = {
    WhitelistRules: [
      {
        Cidr: "0.0.0.0/0", // Allow all traffic (you can restrict this)
      },
    ],
    Tags: {
      Name: `security-group-${userId}`,
    },
  };

  const securityGroupData = await medialive
    .createInputSecurityGroup(securityGroupParams)
    .promise();
  const securityGroupId = securityGroupData.SecurityGroup.Id;

  // Then, create the MediaLive Input using the Security Group ID
  const params = {
    Name: `input-${userId}`,
    Type: "RTMP_PUSH",
    InputSecurityGroups: [securityGroupId], // Use the security group ID
  };

  const data = await medialive.createInput(params).promise();
  return data.Input;
}


async function createMediaLiveChannel(inputId, mediaPackageChannelId) {
  // Assuming mediaPackageChannelId is the ID of the MediaPackage channel you created earlier
  const mediaPackageChannelEndpoints = await createMediaPackageEndpoints(
    mediaPackageChannelId
  );

  const params = {
    Name: `channel-${inputId}`,
    InputSpecification: {
      Codec: "AVC",
      Resolution: "HD",
      MaximumBitrate: "MAX_20_MBPS",
    },
    InputAttachments: [
      {
        InputId: inputId,
        InputAttachmentName: `input-attachment-${inputId}`,
      },
    ],
    Destinations: [
      {
        Id: "destination1",
        Settings: [
          {
            Url: `${mediaPackageChannelEndpoints.hlsEndpoint.Url}/stream1/live1`, // Primary output destination
          },
          {
            Url: `${mediaPackageChannelEndpoints.dashEndpoint.Url}stream2/live2`, // Secondary output destination
          },
        ],
      },
    ],
    EncoderSettings: {
      AudioDescriptions: [
        {
          CodecSettings: {
            AacSettings: {
              Bitrate: 128000,
              CodingMode: "CODING_MODE_2_0",
              InputType: "NORMAL",
              Profile: "LC",
              RateControlMode: "CBR",
              RawFormat: "NONE",
              SampleRate: 48000,
              Specification: "MPEG4",
            },
          },
        },
      ],
      VideoDescriptions: [
        {
          CodecSettings: {
            H264Settings: {
              AdaptiveQuantization: "MEDIUM",
              AfdSignaling: "NONE",
              Bitrate: 5000000,
              EntropyEncoding: "CABAC",
              FlickerAq: "ENABLED",
              FramerateControl: "SPECIFIED",
              FramerateDenominator: 1,
              FramerateNumerator: 30,
              GopSize: 60,
              GopSizeUnits: "FRAMES",
              Level: "H264_LEVEL_AUTO",
              LookAheadRateControl: "HIGH",
              MaxBitrate: 5000000,
              NumRefFrames: 1,
              ParControl: "SPECIFIED",
              ParDenominator: 1,
              ParNumerator: 1,
              Profile: "MAIN",
            },
          },
        },
      ],
    },
    RoleArn: `arn:aws:iam::699475928277:user/adminFormediaLiveandPackage`,
  };
console.log("urls=====", mediaPackageChannelEndpoints.hlsEndpoint.Url);

  const data = await medialive.createChannel(params).promise();
  return data.Channel;
}


async function createMediaPackageChannel(userId) {
  const params = {
    Id: `package-channel-${userId}`,
    Description: `MediaPackage channel for ${userId}`,
  };

  const data = await mediapackage.createChannel(params).promise();
  return data;
}

async function createMediaPackageEndpoints(mediaPackageChannelId) {
  const hlsParams = {
    ChannelId: mediaPackageChannelId,
    Id: `hls-endpoint-${mediaPackageChannelId}`,
    ManifestName: "index",
    StartoverWindowSeconds: 60,
    TimeDelaySeconds: 0,
    SegmentDurationSeconds: 6,
  };

  const dashParams = {
    ChannelId: mediaPackageChannelId,
    Id: `dash-endpoint-${mediaPackageChannelId}`,
    ManifestName: "index",
    MinBufferTimeSeconds: 6,
    SegmentDurationSeconds: 6,
    SuggestedPresentationDelaySeconds: 6,
  };

  const hlsEndpoint = await mediapackage
    .createOriginEndpoint(hlsParams)
    .promise();
  const dashEndpoint = await mediapackage
    .createOriginEndpoint(dashParams)
    .promise();

  return { hlsEndpoint, dashEndpoint };
}
