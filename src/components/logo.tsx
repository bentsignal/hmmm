import { cn } from "@/lib/utils";

export default function Logo({
  size = 50,
  containerClass,
}: {
  size?: number;
  containerClass?: string;
}) {
  const faces = [
    {
      face: "front",
      label: "E",
      transform: `rotateY(0deg) translateZ(${size / 2}px)`,
    },
    {
      face: "right",
      label: "",
      transform: `rotateY(90deg) translateZ(${size / 2}px)`,
    },
    {
      face: "back",
      label: "",
      transform: `rotateY(180deg) translateZ(${size / 2}px)`,
    },
    {
      face: "left",
      label: "B",
      transform: `rotateY(-90deg) translateZ(${size / 2}px)`,
    },
    {
      face: "top",
      label: "Q",
      transform: `rotateX(90deg) translateZ(${size / 2}px)`,
    },
    {
      face: "bottom",
      label: "",
      transform: `rotateX(-90deg) translateZ(${size / 2}px)`,
    },
  ];
  return (
    <div
      className={cn("perspective-midrange", containerClass)}
      style={{
        width: size,
        height: size,
      }}
    >
      <div
        className="relative transform-3d"
        style={{
          width: size,
          height: size,
          transform: "rotateX(-45deg) rotateY(45deg)",
        }}
      >
        {faces.map((face) => (
          <CubeFace
            key={face.label}
            size={size}
            transform={face.transform}
            face={face.face}
          >
            {face.label}
          </CubeFace>
        ))}
      </div>
    </div>
  );
}

const CubeFace = ({
  size,
  children,
  transform,
  face,
}: {
  size: number;
  children?: React.ReactNode;
  transform: string;
  face: string;
}) => {
  return (
    <div
      className="border-2 border-foreground absolute text-foreground
      font-bold flex items-center justify-center text-xl"
      style={{
        width: size,
        height: size,
        textAlign: "center",
        transform,
        border: ["front", "left", "top"].includes(face)
          ? "2px solid var(--foreground)"
          : "none",
      }}
    >
      {children}
    </div>
  );
};
