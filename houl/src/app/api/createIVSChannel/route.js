import { IvsClient, CreateChannelCommand } from "@aws-sdk/client-ivs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { username } = body;

    const client = new IvsClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
      },
    });

    const params = {
      name: username, // Channel name
      type: "STANDARD", // Channel type (BASIC or STANDARD)
      latencyMode: "LOW", // LOW or NORMAL latency
      authorized: false, // Set to true if you want the channel to be restricted
      recordingConfigurationArn:
        "arn:aws:ivs:ap-south-1:699475928277:recording-configuration/Wx7mmhMo4fCt",
    };

    const command = new CreateChannelCommand(params);
    const data = await client.send(command);
    const { channel, streamKey } = data;

    return new Response(
      JSON.stringify({
        serverUrl: `rtmps://${channel.ingestEndpoint}:443/app/`,
        streamKey: streamKey.value,
        streamUrl: channel.playbackUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating IVS channel:", error.message, error.stack);

    return new Response(
      JSON.stringify({ error: "Failed to create IVS channel" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
