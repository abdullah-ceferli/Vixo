import { Compass } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
export default function NotFound() { return <EmptyState icon={<Compass size={30} />} title="Nothing at this address" body="The page may have moved, or the video is not available to you." action="Back to Discover" href="/" />; }
