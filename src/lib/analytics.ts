// GA4 event payloads for client-side interactions.
//
// Events are built here (typed, testable) in component frontmatter and
// serialized onto a `data-ga-event` attribute. A tiny delegated listener in the
// browser parses that attribute and forwards it to gtag, so no analytics logic
// lives in un-testable inline markup. gtag only loads in production, so the
// listener no-ops everywhere else.

export interface GaEvent {
  name: string;
  params: Record<string, string | number>;
}

export interface RelatedPostClick {
  /** slug of the post the reader is currently on */
  source: string;
  /** slug of the related post being clicked */
  target: string;
  /** visible card title */
  title: string;
  /** 1-based position of the card in the grid */
  position: number;
}

/** Build the GA4 event fired when a related-post card is clicked. */
export function relatedPostClickEvent(click: RelatedPostClick): GaEvent {
  return {
    name: 'related_post_click',
    params: {
      source_post: click.source,
      target_post: click.target,
      link_text: click.title,
      position: click.position,
    },
  };
}
