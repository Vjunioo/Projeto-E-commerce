// src/modules/payments/payments.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly entityManager: EntityManager,
    private dataSource: DataSource,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { orderId, method } = createPaymentDto;
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
    });
    if (!order) {
      throw new NotFoundException(`Pedido com ID "${orderId}" não encontrado.`);
    }
    if (order.status !== OrderStatus.WAITING_PAYMENT) {
      throw new BadRequestException(
        `Só é possível criar pagamento para pedidos com status "AGUARDANDO_PAGAMENTO".`,
      );
    }
    const totalAmount = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const newPayment = this.paymentRepository.create({
      order,
      method,
      amount: totalAmount,
    });
    return this.paymentRepository.save(newPayment);
  }

  async confirm(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['order', 'order.items', 'order.items.product'],
    });
    if (!payment) {
      throw new NotFoundException(
        `Pagamento com ID "${paymentId}" não encontrado.`,
      );
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      payment.status = PaymentStatus.PAID;
      await queryRunner.manager.save(payment);
      payment.order.status = OrderStatus.PAID;
      await queryRunner.manager.save(payment.order);
      for (const item of payment.order.items) {
        await queryRunner.manager.decrement(
          'products',
          { id: item.product.id },
          'stock',
          item.quantity,
        );
      }
      await queryRunner.commitTransaction();
      return payment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof Error) {
        throw new BadRequestException(
          `Falha ao confirmar o pagamento: ${err.message}`,
        );
      }
      throw new BadRequestException('Falha ao confirmar o pagamento.');
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(
        `Pagamento com ID "${paymentId}" não encontrado.`,
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        'Não é possível cancelar um pagamento já efetuado.',
      );
    }
    if (payment.status === PaymentStatus.CANCELED) {
      throw new BadRequestException('Este pagamento já está cancelado.');
    }

    await this.entityManager.transaction(async (manager) => {
      payment.status = PaymentStatus.CANCELED;
      await manager.save(payment);

      if (payment.order.status === OrderStatus.WAITING_PAYMENT) {
        payment.order.status = OrderStatus.OPEN;
        await manager.save(payment.order);
      }
    });

    return payment;
  }
}
