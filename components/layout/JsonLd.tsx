/**
 * Structured data for search engines. JSON is static (never user input), and
 * "<" is escaped so the content can never close the script element.
 * Data blocks are not executed, so the CSP does not need a nonce for them.
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
