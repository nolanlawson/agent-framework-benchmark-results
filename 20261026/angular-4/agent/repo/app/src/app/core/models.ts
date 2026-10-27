/** View models shared between pages. They are plain JSON so they can go through TransferState. */

export interface TypeRef {
  /** API name, e.g. `electric`. */
  name: string;
  /** English name, e.g. `Electric`. */
  label: string;
}

export interface PokemonCardData {
  /** Dex number (species ID). */
  id: number;
  /** Species API name, used in the link. */
  name: string;
  /** Humanized species name. */
  label: string;
  sprite: string;
  /** Types in slot order; only shown on the home page. */
  types?: TypeRef[];
  /** Extra line such as "Hidden ability". */
  note?: string;
}

export interface LinkRef {
  name: string;
  label: string;
}
