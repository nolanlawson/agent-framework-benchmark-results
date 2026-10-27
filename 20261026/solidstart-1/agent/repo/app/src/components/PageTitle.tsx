import { Title } from "@solidjs/meta";
import { pageTitle, SITE_NAME } from "~/lib/format";

/** Sets the document title from the page's h1 text (the home page uses the bare site name). */
export function PageTitle(props: { heading?: string }) {
  return <Title>{props.heading ? pageTitle(props.heading) : SITE_NAME}</Title>;
}
