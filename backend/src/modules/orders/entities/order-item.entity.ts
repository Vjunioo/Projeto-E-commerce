// src/modules/orders/entities/order-item.entity.ts
import { Product } from '../../products/entities/product.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity({ name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @ManyToOne('Order', (order: Order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne('Product', (product: Product) => product.orderItems)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
