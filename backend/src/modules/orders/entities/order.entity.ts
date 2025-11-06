// src/modules/orders/entities/order.entity.ts

import { User } from '../../users/entities/user.entity';
import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum OrderStatus {
  OPEN = 'ABERTO',
  WAITING_PAYMENT = 'AGUARDANDO_PAGAMENTO',
  PAID = 'PAGO',
  CANCELED = 'CANCELADO',
}

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.OPEN })
  status: OrderStatus;

  @ManyToOne('User', (user: User) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany('OrderItem', (orderItem: OrderItem) => orderItem.order, {
    cascade: true,
  })
  items: OrderItem[];

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Payment;
}
