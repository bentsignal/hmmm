"use client";

import { useState } from "react";

export default function XRApp() {
  const [red, setRed] = useState(false);

  return (
    <mesh
      pointerEventsType={{ deny: "grab" }}
      onClick={() => setRed(!red)}
      position={[0, 1, -1]}
    >
      <boxGeometry />
      <meshBasicMaterial color={red ? "red" : "blue"} />
    </mesh>
  );
}
