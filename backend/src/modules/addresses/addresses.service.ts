// src/modules/addresses/addresses.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './entities/address.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(createAddressDto: CreateAddressDto): Promise<Address> {
    const { userId, ...addressData } = createAddressDto;
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Usuário com ID "${userId}" não encontrado.`);
    }

    const address = this.addressRepository.create({ ...addressData, user });

    await this.entityManager.transaction(async (manager) => {
      await manager.save(address);

      if (address.isDefault) {
        await manager.update(
          Address,
          { user: { id: userId }, id: Not(address.id) },
          { isDefault: false },
        );
      }
    });

    return address;
  }

  async update(
    id: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.addressRepository.preload({
      id,
      ...updateAddressDto,
    });
    if (!address) {
      throw new NotFoundException(`Endereço com ID "${id}" não encontrado.`);
    }

    await this.entityManager.transaction(async (manager) => {
      await manager.save(address);

      if (address.isDefault) {
        const addressWithUser = await manager.findOne(Address, {
          where: { id },
          relations: ['user'],
        });

        // ✅ A verificação que resolve o erro "possibly 'null'"
        if (!addressWithUser) {
          // Lançamos um erro claro se algo inesperado acontecer.
          throw new InternalServerErrorException(
            'Ocorreu um erro ao atualizar o endereço padrão.',
          );
        }

        // A partir daqui, o TypeScript sabe que 'addressWithUser' é seguro.
        await manager.update(
          Address,
          { user: { id: addressWithUser.user.id }, id: Not(address.id) },
          { isDefault: false },
        );
      }
    });

    return address;
  }

  findAllByUser(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { user: { id: userId } },
    });
  }

  async findOne(id: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!address) {
      throw new NotFoundException(`Endereço com ID "${id}" não encontrado.`);
    }
    return address;
  }

  async remove(id: string): Promise<void> {
    const address = await this.findOne(id);
    await this.addressRepository.remove(address);
  }
}
