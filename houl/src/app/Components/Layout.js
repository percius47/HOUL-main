// app/components/Layout.js
"use client";

import { useState } from "react";
import Modal from "./Modal";

const Layout = ({ children }) => {
  const [showModal, setShowModal] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return (
    <div>
      <header>
        <nav>
          <button onClick={openModal}>Go Live</button>
        </nav>
      </header>
      <main>{children}</main>
      {showModal && <Modal onClose={closeModal} />}
    </div>
  );
};

export default Layout;
