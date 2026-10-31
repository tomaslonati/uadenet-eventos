import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const resultado = this.schema.safeParse(value);
    if (!resultado.success) {
      const mensajes = resultado.error.issues.map((i) => {
        const campo = i.path.length > 0 ? `${i.path.join('.')}: ` : '';
        return `${campo}${i.message}`;
      });
      throw new BadRequestException(mensajes);
    }
    return resultado.data;
  }
}
