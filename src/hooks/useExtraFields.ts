import { useState, useEffect } from 'react';
import { api } from '../api';
import type { ExtraFieldDefinition } from '../types';

export function useExtraFields() {
  const [definitions, setDefinitions] = useState<ExtraFieldDefinition[]>([]);

  useEffect(() => {
    api.getExtraFieldDefinitions().then(setDefinitions).catch(() => {});
  }, []);

  return definitions;
}
