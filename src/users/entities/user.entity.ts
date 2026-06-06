import { Column, Entity } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  nickname!: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  email!: string;

  /**
   * Stored as a bcrypt hash (cost factor controlled by BCRYPT_SALT_ROUNDS env).
   * @Exclude prevents this field from being serialized in HTTP responses
   * via ClassSerializerInterceptor applied on UsersController.
   */
  @Exclude()
  @Column({ type: 'varchar' })
  password!: string;
}
