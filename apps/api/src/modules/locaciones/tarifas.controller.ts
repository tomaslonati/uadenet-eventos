import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TarifasService } from '../../common/backoffice/tarifas.service';
import { CoreJwtGuard } from '../../common/guards/core-jwt.guard';

export interface TarifasVigentesResponse {
  general: number | null;
  especial: number | null;
}

@ApiTags('tarifas')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard)
@Controller({ path: 'tarifas', version: '1' })
export class TarifasController {
  constructor(private readonly tarifasService: TarifasService) {}

  @Get()
  @ApiOkResponse({
    description:
      'Tarifas vigentes de inscripción a eventos parametrizadas por Backoffice Administrativo',
  })
  async obtenerVigentes(): Promise<TarifasVigentesResponse> {
    await this.tarifasService.asegurarCargado();
    return {
      general: this.tarifasService.precioDe('general'),
      especial: this.tarifasService.precioDe('especial'),
    };
  }
}
