// Structured data. Google reads this to build rich results for courses and
// events — the one SEO lever on a site this small that produces a visibly
// different search listing rather than a marginally better rank.
//
// The JSON is stringified once here and injected with
// dangerouslySetInnerHTML because that is the only way to emit a
// <script type="application/ld+json"> body in React. The `<` escape stops
// a stray "</script>" inside any admin-entered string from closing the tag
// early, which would be an XSS vector on otherwise-trusted copy.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
