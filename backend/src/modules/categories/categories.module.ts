// src/modules/categories/categories.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  // Ponto crucial: CategoriesController DEVE estar aqui.
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
