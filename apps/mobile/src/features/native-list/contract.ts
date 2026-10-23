// The contract between JavaScript and the native message list
// (UICollectionView on iOS, RecyclerView on Android). JavaScript decides
// what to show and what it means; native draws, scrolls, and animates it.
// See .plans/native-message-list.md. The native code is in
// apps/mobile/modules/message-list (ios/, android/).
//
// Rules, so an over-the-air update can never break an older binary:
// - Bump `CONTRACT_VERSION` when native must understand something new.
// - JavaScript sends only the row kinds and block types the installed
//   binary lists in `supports` (see `nativeSupport`); anything else goes
//   as a `custom` row with `fallbackText`.
// - Native ignores fields it doesn't know, never crashes on them, and
//   draws an unknown row kind or block type as its `fallbackText`.
// - Every value is plain JSON: strings, numbers, booleans, arrays, objects.

/** The contract this JavaScript speaks. Native reports its own. */
export const CONTRACT_VERSION = 1;

/** What version 1 of the native list can draw. */
export const V1_ROW_KINDS = [
  "message",
  "header",
  "notice",
  "typing",
  "custom",
] as const;
export const V1_BLOCK_TYPES = [
  "text",
  "media",
  "file",
  "linkCard",
  "quote",
  "deleted",
] as const;

export type RowKind = (typeof V1_ROW_KINDS)[number];
export type BlockType = (typeof V1_BLOCK_TYPES)[number];

// MARK: Rows

/**
 * The list's rows, newest first (index 0 is at the bottom). Each row's
 * `id` is stable for as long as it exists: native diffs by `id`, animates
 * inserts and removals, and keeps the reader's place when rows are added
 * above them (older pages). A row whose content changes keeps its `id`
 * and native updates it in place, animating any height change.
 */
export type Row = MessageRow | HeaderRow | NoticeRow | TypingRow | CustomRow;

interface RowBase {
  readonly id: string;
  /**
   * What to draw if this binary can't draw the row (an unknown kind, an
   * unknown block in it): plain text in the row's place.
   */
  readonly fallbackText?: string;
}

export interface Person {
  readonly id: string;
  readonly name: string;
  /** Photo URL, or null for initials on gray (see `initials`). */
  readonly avatarUrl: string | null;
  /** One or two letters for the monogram when there's no photo. */
  readonly initials: string;
}

export interface MessageRow extends RowBase {
  readonly kind: "message";
  /** Bubbles (iMessage) or stacked (Slack/Discord). */
  readonly layout: "bubbles" | "stacked";
  readonly author: Person;
  /** Yours: bubbles sit on the right, in the outgoing color. */
  readonly isOwn: boolean;
  /** Show the author's name and photo (groups; first of a run). */
  readonly showAuthor: boolean;
  /** First message of a run by the same author. */
  readonly startsGroup: boolean;
  /** Last of a run: bubbles draw their tail here. */
  readonly endsGroup: boolean;
  /** Milliseconds since the epoch. */
  readonly sentAt: number;
  /** The time as shown (stacked rows' header; bubbles' revealed time). */
  readonly timeLabel: string;
  readonly blocks: readonly Block[];
  readonly reactions: readonly Reaction[];
  /** Lines under the message: "1 reply", "Edited", "Not sent". */
  readonly footer: readonly FooterLine[];
  /** Still sending (drawn faded) or failed. */
  readonly status?: "sending" | "failed";
  /** The message a search or notification opened on: tinted. */
  readonly highlighted?: boolean;
  /**
   * Arrived while the conversation was open: native animates it in (or,
   * in a firehose, shows it at once; see `Behavior`). Rows there when the
   * list first showed, or loaded as older pages, just appear.
   */
  readonly arrived?: boolean;
  /** For VoiceOver and TalkBack: the whole message read out. */
  readonly accessibilityLabel: string;
}

/** A time header (bubbles, after a pause) or day separator (stacked). */
export interface HeaderRow extends RowBase {
  readonly kind: "header";
  readonly style: "time" | "day";
  /** The text, already formatted: "Today 9:41 AM". */
  readonly label: string;
}

/** "Leo joined the conversation". */
export interface NoticeRow extends RowBase {
  readonly kind: "notice";
  readonly spans: readonly Span[];
}

/** Who's typing, under the newest message. At most one, at index 0. */
export interface TypingRow extends RowBase {
  readonly kind: "typing";
  readonly layout: "bubbles" | "stacked";
  readonly people: readonly Person[];
  /** "Maya is typing", for stacked rows. */
  readonly label: string;
}

/**
 * Something this binary has no native kind for yet. Version 1 draws its
 * `fallbackText`; a later version may host a React view here (the escape
 * hatch for rare row kinds).
 */
export interface CustomRow extends RowBase {
  readonly kind: "custom";
  /** Which JavaScript component would draw it. */
  readonly component: string;
  readonly props?: Readonly<Record<string, unknown>>;
}

// MARK: Blocks: what a message is made of, top to bottom

export type Block =
  | TextBlock
  | MediaBlock
  | FileBlock
  | LinkCardBlock
  | QuoteBlock
  | DeletedBlock;

/**
 * Each block that can take reactions has a `part`: the reaction part ID
 * (see `features/messaging/reactions.ts`), which taps and holds report.
 */
interface BlockBase {
  readonly part?: string;
}

export interface TextBlock extends BlockBase {
  readonly type: "text";
  readonly spans: readonly Span[];
  /** Only emoji, up to three: drawn large, with no bubble. */
  readonly jumbo?: boolean;
}

export interface Span {
  readonly text: string;
  readonly style?: "mention" | "link" | "bold" | "italic" | "code";
  /** For links: what tapping opens. */
  readonly url?: string;
  /** For mentions: the account. */
  readonly accountId?: string;
}

export interface MediaItem {
  readonly id: string;
  readonly kind: "image" | "video";
  /** Full size (or the video). */
  readonly url: string;
  /** Poster for videos; a smaller rendition for images if there is one. */
  readonly thumbnailUrl?: string;
  /** A local file while it uploads. */
  readonly localUrl?: string;
  /** Pixel size, so the cell's height is known before it loads. */
  readonly width: number;
  readonly height: number;
  /** Video length, for its badge. */
  readonly durationSeconds?: number;
  /** Its own reaction part: each photo in a group takes reactions. */
  readonly part: string;
  readonly reactions: readonly Reaction[];
  readonly uploading?: boolean;
}

/**
 * One or more photos and videos. One is drawn alone. Several are drawn as
 * a group: in stacked rows, an edge-to-edge horizontal carousel that snaps
 * item by item; in bubbles, a stack of cards swiped left and right (like
 * Messages). Tapping one reports its index, so JavaScript can open the
 * viewer on it and swipe through the whole group.
 */
export interface MediaBlock extends BlockBase {
  readonly type: "media";
  readonly items: readonly MediaItem[];
}

export interface FileBlock extends BlockBase {
  readonly type: "file";
  readonly name: string;
  /** "2.4 MB". */
  readonly sizeLabel: string;
  readonly url: string;
}

export interface LinkCardBlock extends BlockBase {
  readonly type: "linkCard";
  readonly url: string;
  readonly title?: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly imageWidth?: number;
  readonly imageHeight?: number;
  /** "youtube.com". */
  readonly site: string;
}

/** The message a reply answers, above it. */
export interface QuoteBlock extends BlockBase {
  readonly type: "quote";
  readonly author: Person;
  readonly text: string;
  readonly thumbnailUrl?: string;
  /** The quoted message's ID, which tapping reports. */
  readonly messageId: string;
}

/** "This message was deleted" (a deleted thread original). */
export interface DeletedBlock extends BlockBase {
  readonly type: "deleted";
  readonly label: string;
}

// MARK: Reactions: data, so new ones ship over the air

export interface Reaction {
  /** Stable for this reaction on this part ("👍"). */
  readonly key: string;
  /**
   * What it shows: any emoji (drawn as text, so every emoji works), or an
   * image (custom emoji, later).
   */
  readonly content:
    | { readonly emoji: string }
    | { readonly imageUrl: string; readonly label: string };
  readonly count: number;
  /** Includes yours: tinted. */
  readonly mine: boolean;
}

export interface FooterLine {
  readonly kind: "replies" | "edited" | "notSent";
  readonly text: string;
  /** Photos beside "3 replies". */
  readonly people?: readonly Person[];
}

// MARK: How it looks and behaves: values, so they ship over the air

export interface Theme {
  readonly colors: {
    readonly background: string;
    /**
     * Cards over the background (link previews). Optional: older
     * JavaScript doesn't send it, and native uses `background` then.
     */
    readonly backgroundElevated?: string;
    readonly foreground: string;
    readonly muted: string;
    readonly subtle: string;
    readonly separator: string;
    readonly fill: string;
    readonly accent: string;
    readonly onAccent: string;
    readonly bubbleIncoming: string;
    readonly bubbleOutgoing: string;
    readonly textIncoming: string;
    readonly textOutgoing: string;
    readonly destructive: string;
    readonly highlight: string;
    readonly monogramTop: string;
    readonly monogramBottom: string;
  };
  /** Point sizes and line heights. */
  readonly type: {
    readonly body: { readonly size: number; readonly lineHeight: number };
    readonly name: { readonly size: number; readonly lineHeight: number };
    readonly caption: { readonly size: number; readonly lineHeight: number };
    readonly footnote: { readonly size: number; readonly lineHeight: number };
    readonly jumbo: { readonly size: number; readonly lineHeight: number };
  };
  readonly metrics: {
    readonly bubbleRadius: number;
    readonly bubbleMaxWidthFraction: number;
    readonly avatarSize: number;
    readonly horizontalPadding: number;
    /** Space above a run's first row, and above the rest. */
    readonly runGap: number;
    readonly rowGap: number;
  };
}

export interface Behavior {
  /** How long the messages take to make room, and how a new one fades. */
  readonly moveMs: number;
  readonly fadeMs: number;
  /**
   * Past this many arrivals in `firehoseWindowMs`, new messages show at
   * once with no animation, until it's down to `firehoseUntil`.
   */
  readonly firehoseFrom: number;
  readonly firehoseUntil: number;
  readonly firehoseWindowMs: number;
  /** How many screens from the top it asks for older messages. */
  readonly loadAheadScreens: number;
  /** How close to the newest message (points) counts as at the bottom. */
  readonly nearLatestPoints: number;
}

// MARK: The view

export interface Insets {
  /** Under the header. */
  readonly top: number;
  /** Over the composer (the keyboard is added natively, see `keyboard`). */
  readonly bottom: number;
}

export interface MessageListViewProps {
  readonly contractVersion: number;
  readonly rows: readonly Row[];
  readonly theme: Theme;
  readonly behavior: Behavior;
  readonly insets: Insets;
  /**
   * Native follows the keyboard itself (frame by frame, interactive
   * dismissal by dragging the list), adding its height to `insets.bottom`.
   */
  readonly keyboard: boolean;
  /** A row lifted into the menu: hidden in the list while it's up. */
  readonly liftedRowId?: string;
  /** Opens on this row (a search or notification) instead of the newest. */
  readonly initialRowId?: string;
  readonly onEvent: (event: { nativeEvent: ListEvent }) => void;
}

/** What happened in the list, for JavaScript to act on. */
export type ListEvent =
  | {
      readonly type: "press";
      readonly rowId: string;
      readonly target:
        | "message"
        | "media"
        | "reaction"
        | "link"
        | "mention"
        | "author"
        | "quote"
        | "replies"
        | "notSent"
        | "file"
        | "linkCard";
      readonly part?: string;
      /** For media: which item of the group. */
      readonly index?: number;
      readonly reactionKey?: string;
      readonly url?: string;
      readonly accountId?: string;
      readonly messageId?: string;
    }
  | {
      /** Held (or double tapped): JavaScript opens the menu. */
      readonly type: "hold";
      readonly rowId: string;
      readonly part?: string;
      readonly index?: number;
      /** Where the held part is, in window coordinates. */
      readonly frame: {
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
      };
    }
  | { readonly type: "reachedOlder" }
  | { readonly type: "reachedNewer" }
  | { readonly type: "nearLatest"; readonly near: boolean }
  /** The rows on screen changed (read marks, the jump button). */
  | { readonly type: "visible"; readonly rowIds: readonly string[] }
  /** Placed on the initial row (or the newest), and showing. */
  | { readonly type: "ready" };

/** Imperative calls on the view (through its ref). */
export interface MessageListViewMethods {
  scrollToLatest(animated: boolean): Promise<void>;
  scrollToRow(rowId: string, animated: boolean): Promise<void>;
}

/** What the installed binary reports (the module's constants). */
export interface NativeSupport {
  readonly contractVersion: number;
  readonly rowKinds: readonly string[];
  readonly blockTypes: readonly string[];
}
