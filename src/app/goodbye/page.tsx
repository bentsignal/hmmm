export default function GoodbyePage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-4 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Account Successfully Deleted</h1>
        <p className="text-muted-foreground text-md text-center">
          Sorry to see you go. If you change your mind down the road, you know
          where to find us!
        </p>
      </div>
    </div>
  );
}
