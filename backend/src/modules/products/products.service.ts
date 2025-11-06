// src/modules/products/products.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from 'src/modules/categories/entities/category.entity';
import { FindManyOptions, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(name?: string, categoryId?: string): Promise<Product[]> {
    const where: FindOptionsWhere<Product> = {};

    if (name) {
      where.name = ILike(`%${name}%`);
    }

    if (categoryId) {
      where.category = { id: categoryId } as Category;
    }

    const options: FindManyOptions<Product> = {
      relations: ['category'],
      where,
    };

    return this.productRepository.find(options);
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, ...productData } = createProductDto;

    const category = await this.categoryRepository.findOneBy({
      id: categoryId,
    });
    if (!category) {
      throw new NotFoundException(
        `Categoria com ID "${categoryId}" não encontrada.`,
      );
    }

    const product = this.productRepository.create({
      ...productData,
      category,
    });

    return this.productRepository.save(product);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado.`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOneBy({
        id: updateProductDto.categoryId,
      });

      if (!category) {
        throw new NotFoundException(
          `Categoria com ID "${updateProductDto.categoryId}" não encontrada.`,
        );
      }
    }

    const product = await this.productRepository.preload({
      id,
      ...updateProductDto,
      category: updateProductDto.categoryId
        ? { id: updateProductDto.categoryId }
        : undefined,
    });

    if (!product) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado.`);
    }

    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}
