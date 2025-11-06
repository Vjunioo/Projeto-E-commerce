// src/modules/orders/orders.service.ts

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { userId, items } = createOrderDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Usuário com ID "${userId}" não encontrado.`);
    }

    const productIds = items.map((item) => item.productId);
    const products = await this.productRepository.findBy({
      id: In(productIds),
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Um ou mais produtos não foram encontrados.');
    }

    const orderItems: OrderItem[] = [];
    for (const itemDto of items) {
      const product = products.find((p) => p.id === itemDto.productId);

      if (!product) {
        throw new InternalServerErrorException(
          `Produto com ID ${itemDto.productId} não encontrado após a busca.`,
        );
      }
      if (!product.isActive) {
        throw new BadRequestException(
          `O produto "${product.name}" não está ativo e não pode ser comprado.`,
        );
      }
      if (product.stock < itemDto.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para o produto "${product.name}".`,
        );
      }

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.quantity = itemDto.quantity;
      orderItem.unitPrice = product.price;
      orderItems.push(orderItem);
    }

    const order = new Order();
    order.user = user;
    order.items = orderItems;
    order.status = OrderStatus.OPEN;

    return this.orderRepository.save(order);
  }

  async initiatePayment(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException(`Pedido com ID "${orderId}" não encontrado.`);
    }
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException(
        'O pagamento só pode ser iniciado para pedidos com status "ABERTO".',
      );
    }
    order.status = OrderStatus.WAITING_PAYMENT;
    return this.orderRepository.save(order);
  }

  async cancel(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException(`Pedido com ID "${orderId}" não encontrado.`);
    }
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException(
        'Não é possível cancelar um pedido que já foi pago.',
      );
    }
    if (order.status === OrderStatus.CANCELED) {
      throw new BadRequestException('Este pedido já está cancelado.');
    }
    order.status = OrderStatus.CANCELED;
    return this.orderRepository.save(order);
  }
}
