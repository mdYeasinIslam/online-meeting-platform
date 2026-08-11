import { Button } from "antd";
import LiveHandTracking from "../@modules/LiveHandTracking/Components/LiveHandTracking";

export default function Home() {
  return (
    <div className="pt-20 font-semibold">
      <Button className="bg-(--color-primary-500) hover:bg-transparent text-yellow-500">
        Join meeting
      </Button>
      <LiveHandTracking />
    </div>
  );
}
