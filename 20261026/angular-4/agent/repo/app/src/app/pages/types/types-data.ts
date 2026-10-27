import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Catalog } from '../../core/catalog';
import { PageData } from '../../core/page-data';
import { TypeRef } from '../../core/models';

export const typesResolver: ResolveFn<TypeRef[]> = () => {
  const catalog = inject(Catalog);
  return inject(PageData).load('types', () => catalog.typeRefs());
};
