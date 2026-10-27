import { HttpStatusCode } from "@solidjs/start";
import { PageTitle } from "./PageTitle";

export function NotFound() {
  return (
    <>
      <PageTitle heading="Not found" />
      <HttpStatusCode code={404} />
      <h1 class="page-title">Not found</h1>
      <p>
        <a href="/">Back to the Pokédex</a>
      </p>
    </>
  );
}
