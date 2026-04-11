import { create } from "zustand";

interface MessageStore {
  numMessagesSent: number;
  setNumMessagesSent: (num: number) => void;
}

const useMessageStore = create<MessageStore>((set) => ({
  numMessagesSent: 0,
  setNumMessagesSent: (num) => set({ numMessagesSent: num }),
}));

export default useMessageStore;
