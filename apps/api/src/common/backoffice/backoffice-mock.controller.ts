import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type {
  ConceptoTarifa,
  EspacioBackoffice,
  SedeBackoffice,
  TarifaVigente,
  UsuarioBackoffice,
} from '@repo/contracts';

const SEDES: SedeBackoffice[] = [
  { id: 'a1b2c3d4-0001-4a00-8000-000000000001', nombre: 'Sede Centro' },
  { id: 'a1b2c3d4-0002-4a00-8000-000000000002', nombre: 'Sede Norte' },
  { id: 'a1b2c3d4-0003-4a00-8000-000000000003', nombre: 'Sede Costa' },
];

const [CENTRO, NORTE, COSTA] = SEDES.map((sede) => sede.id) as [
  string,
  string,
  string,
];

function espacio(
  n: number,
  sedeId: string,
  datos: Omit<EspacioBackoffice, 'id' | 'sedeId'>,
): EspacioBackoffice {
  return {
    id: `b0b0b0b0-0000-4000-8000-${String(n).padStart(12, '0')}`,
    sedeId,
    ...datos,
  };
}

const ESPACIOS: EspacioBackoffice[] = [
  espacio(1, CENTRO, {
    codigo: 'C-001',
    nombre: 'Auditorio Magno',
    tipo: 'SALA_EVENTOS',
    capacidad: 300,
    aptoEventos: true,
    estado: 'ACTIVO',
  }),
  espacio(2, CENTRO, {
    codigo: 'C-002',
    nombre: 'Aula Magna B',
    tipo: 'SALA_EVENTOS',
    capacidad: 80,
    aptoEventos: true,
    estado: 'ACTIVO',
  }),
  espacio(3, CENTRO, {
    codigo: 'C-003',
    nombre: 'Laboratorio 4',
    tipo: 'LABORATORIO',
    capacidad: 40,
    aptoEventos: true,
    estado: 'ACTIVO',
  }),
  espacio(4, CENTRO, {
    codigo: 'C-004',
    nombre: 'Hall Central',
    tipo: 'HALL',
    capacidad: 400,
    aptoEventos: true,
    estado: 'ACTIVO',
  }),
  espacio(5, CENTRO, {
    codigo: 'C-201',
    nombre: 'Aula 201',
    tipo: 'AULA',
    capacidad: 35,
    aptoEventos: false,
    estado: 'ACTIVO',
  }),
  espacio(6, NORTE, {
    codigo: 'N-001',
    nombre: 'Salón de Actos',
    tipo: 'SALA_EVENTOS',
    capacidad: 150,
    aptoEventos: true,
    estado: 'ACTIVO',
  }),
  espacio(7, NORTE, {
    codigo: 'N-302',
    nombre: 'Aula 302',
    tipo: 'AULA',
    capacidad: 40,
    aptoEventos: true,
    estado: 'ACTIVO',
  }),
  espacio(8, NORTE, {
    codigo: 'N-010',
    nombre: 'Sala en refacción',
    tipo: 'SALA_EVENTOS',
    capacidad: 60,
    aptoEventos: true,
    estado: 'INACTIVO',
  }),
  espacio(9, COSTA, {
    codigo: 'K-001',
    nombre: 'Auditorio B',
    tipo: 'SALA_EVENTOS',
    capacidad: 150,
    aptoEventos: true,
    estado: 'ACTIVO',
  }),
  espacio(10, COSTA, {
    codigo: 'K-108',
    nombre: 'Aula 108',
    tipo: 'AULA',
    capacidad: 40,
    aptoEventos: true,
    estado: 'ACTIVO',
  }),
];

/** Mismos valores que `TARIFAS_INSCRIPCION` en `apps/web/lib/mock/eventos.ts`. */
const MONTOS: Record<ConceptoTarifa, number> = {
  EVENTO_INSCRIPCION_GENERAL: 5_500,
  EVENTO_INSCRIPCION_ESPECIAL: 12_500,
};

const VIGENTE_DESDE = '2026-01-01';

export function obtenerSedesMock(): SedeBackoffice[] {
  return SEDES;
}

export function obtenerEspaciosMock(
  sedeId: string,
  aptoEventos?: boolean,
): EspacioBackoffice[] | null {
  if (!SEDES.some((sede) => sede.id === sedeId)) {
    return null;
  }

  return ESPACIOS.filter(
    (espacio) =>
      espacio.sedeId === sedeId && (!aptoEventos || espacio.aptoEventos),
  );
}

export function obtenerTarifaVigenteMock(
  concepto: string,
  fecha: string,
): TarifaVigente | null {
  if (!(concepto in MONTOS) || !fecha || fecha < VIGENTE_DESDE) {
    return null;
  }

  return {
    concepto: concepto as ConceptoTarifa,
    sede: null,
    ambitoResuelto: 'GLOBAL',
    monto: MONTOS[concepto as ConceptoTarifa],
    moneda: 'ARS',
    unidad: 'MONTO_FIJO',
    vigencia: { desde: VIGENTE_DESDE, hasta: null },
    tarifaId: '8f1e2d3c-4b5a-4789-8abc-def123456789',
  };
}

export function obtenerUsuarioMock(id: string): UsuarioBackoffice {
  const demos: Record<string, UsuarioBackoffice> = {
    'seed-admin-demo': {
      id: 'seed-admin-demo',
      nombre: 'Mariana Ibarra',
      email: 'm.ibarra@uadenet.edu',
      rol: 'administrativo',
      sede: 'Sede Centro',
    },
    'seed-docente-demo': {
      id: 'seed-docente-demo',
      nombre: 'Dr. Esteban Ruiz',
      email: 'e.ruiz@uadenet.edu',
      rol: 'docente',
      sede: 'Sede Centro',
    },
    'seed-alumno-demo': {
      id: 'seed-alumno-demo',
      nombre: 'Tomás Vidal',
      email: 't.vidal@uadenet.edu',
      rol: 'estudiante',
      sede: 'Sede Centro',
    },
  };

  return (
    demos[id] ?? {
      id,
      nombre: 'Usuario Demo',
      email: `${id}@uadenet.edu`,
      rol: 'estudiante',
      sede: 'Sede Centro',
    }
  );
}

/**
 * Backoffice Administrativo simulado, sobre los paths que ellos publicaron.
 * Solo se monta sin `BACKOFFICE_BASE_URL`; con la variable definida el cliente
 * le pega al Backoffice real y este controller no existe.
 */
@ApiExcludeController()
@Controller({ path: 'backoffice', version: '1' })
export class BackofficeMockController {
  @Get('sedes')
  sedes(): SedeBackoffice[] {
    return obtenerSedesMock();
  }

  @Get('sedes/:sedeId/espacios')
  espacios(
    @Param('sedeId') sedeId: string,
    @Query('aptoEventos') aptoEventos?: string,
  ): EspacioBackoffice[] {
    const lista = obtenerEspaciosMock(sedeId, aptoEventos === 'true');
    if (!lista) {
      throw new NotFoundException('La sede no existe.');
    }
    return lista;
  }

  @Get('tarifas/vigente')
  tarifaVigente(
    @Query('concepto') concepto: string,
    @Query('fecha') fecha: string,
  ): TarifaVigente {
    const tarifa = obtenerTarifaVigenteMock(concepto, fecha);
    if (!tarifa) {
      throw new NotFoundException('No hay tarifa vigente.');
    }
    return tarifa;
  }

  @Get('usuarios/:id')
  usuario(@Param('id') id: string): UsuarioBackoffice {
    return obtenerUsuarioMock(id);
  }
}
