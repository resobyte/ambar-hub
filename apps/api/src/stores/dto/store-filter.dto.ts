import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class StoreFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @IsIn(['TRENDYOL', 'HEPSIBURADA', 'IKAS', 'MANUAL'])
  type?: string;
}
