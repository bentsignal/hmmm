import { cn } from "@/lib/utils";
import "@/styles/logo-anim.css";

export default function Logo({
  size = 50,
  containerClass,
  faceClass = "bg-background supports-[backdrop-filter]:bg-background/50 supports-[backdrop-filter]:backdrop-blur-md",
  spin = false,
}: {
  size?: number;
  containerClass?: string;
  faceClass?: string;
  spin?: boolean;
}) {
  return null;
  const faces = [
    {
      face: "front",
      label: "E",
      transform: `rotateY(0deg) translateZ(${size / 2}px)`,
    },
    // {
    //   face: "right",
    //   label: "B",
    //   transform: `rotateY(90deg) translateZ(${size / 2}px)`,
    // },
    // {
    //   face: "back",
    //   label: "E",
    //   transform: `rotateY(180deg) translateZ(${size / 2}px)`,
    // },
    {
      face: "left",
      label: "B",
      transform: `rotateY(-90deg) translateZ(${size / 2}px)`,
    },
    {
      face: "top",
      label: "Q",
      transform: `rotateX(90deg) rotateZ(90deg) translateZ(${size / 2}px)`,
    },
    // {
    //   face: "bottom",
    //   label: "Q",
    //   transform: `rotateX(-90deg) translateZ(${size / 2}px)`,
    // },
  ];
  return (
    <div
      className={cn("select-none perspective-near", containerClass)}
      style={{
        width: size,
        height: size,
      }}
    >
      <div
        className={cn("relative transform-3d", spin && "cube-spin")}
        style={{
          width: size,
          height: size,
          transform: !spin
            ? "rotateX(-40deg) rotateY(45deg) rotateZ(0deg)"
            : undefined,
        }}
      >
        {faces.map((face) => (
          <CubeFace
            key={face.face}
            size={size}
            transform={face.transform}
            className={faceClass}
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
  className,
}: {
  size: number;
  children?: React.ReactNode;
  transform: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "border-border text-foreground absolute flex items-center justify-center border-2 text-xl font-bold",
        className,
      )}
      style={{
        width: size,
        height: size,
        textAlign: "center",
        transform,
      }}
    >
      {children}
    </div>
  );
};
