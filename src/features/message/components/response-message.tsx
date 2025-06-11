// eslint-disable-next-line
export default function ResponseMessage({ message }: { message: any }) {
  return <div className="flex items-start">{message.value}</div>;
}
