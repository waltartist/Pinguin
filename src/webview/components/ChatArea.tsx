import { Transcript } from "./Transcript";
import { Composer } from "./Composer";

/**
 * Combined chat area that pairs the transcript with the composer
 * input always pinned to the bottom.
 */
export function ChatArea() {
  return (
    <div className="chat-area">
      <Transcript />
      <Composer />
    </div>
  );
}
