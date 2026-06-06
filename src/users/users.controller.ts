import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * All routes require a valid Bearer token — consistent with the requirement
 * that every route in the system must be JWT-protected.
 *
 * ClassSerializerInterceptor honours @Exclude() on the User entity,
 * ensuring the password hash is stripped from every response automatically.
 */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: 201, description: 'User created — password hash excluded from response' })
  @ApiResponse({ status: 409, description: 'Nickname or email already exists' })
  @Post()
  createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.createUser(createUserDto);
  }

  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Array of users — password hash excluded' })
  @Get()
  findAllUsers(): Promise<User[]> {
    return this.usersService.findAllUsers();
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User found — password hash excluded' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  findUserById(@Param('id') id: string): Promise<User> {
    return this.usersService.findUserById(id);
  }
}
