// src/features/catalog/CatalogBootstrapGate.tsx
//
// Empty-body component that ensures the notification catalog is fetched once
// after the user is authenticated. Subsequent revalidations are short-circuited
// by the slice/thunk (no-op if catalog has been fetched and ETag is unchanged).

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectIsAuthenticated } from "../auth";
import { fetchCatalog } from "./catalogThunks";
import { selectCatalogStatus } from "./catalogSelectors";

export function CatalogBootstrapGate() {
  const dispatch = useAppDispatch();
  const isAuthed = useAppSelector(selectIsAuthenticated);
  const status = useAppSelector(selectCatalogStatus);

  useEffect(() => {
    if (!isAuthed) return;
    // Fetch on first mount after auth; the thunk handles ETag revalidation
    // internally, so dispatching again is cheap (304 → no-op).
    if (status === "idle" || status === "stale" || status === "failed") {
      void dispatch(fetchCatalog());
    }
  }, [dispatch, isAuthed, status]);

  return null;
}
