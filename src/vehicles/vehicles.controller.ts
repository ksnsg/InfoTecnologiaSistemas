import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesQueryService } from './vehicles-query.service';
import { VehiclesRegistrationService } from './vehicles-registration.service';

/**
 * All routes require a valid Bearer token.
 * Guard is applied at the controller class level so every future
 * route is protected by default.
 */
@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesQueryService: VehiclesQueryService,
    private readonly vehiclesRegistrationService: VehiclesRegistrationService,
  ) {}

  @ApiOperation({ summary: 'Register a vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle registered' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiResponse({ status: 409, description: 'License plate, chassis, or renavam already exists' })
  @Post()
  createVehicle(
    @Body() dto: CreateVehicleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Vehicle> {
    return this.vehiclesRegistrationService.createVehicle(dto, req.user.sub);
  }

  @ApiOperation({ summary: 'List all vehicles (Redis cached)' })
  @ApiResponse({ status: 200, description: 'Array of vehicles' })
  @Get()
  findAllVehicles(): Promise<Vehicle[]> {
    return this.vehiclesQueryService.findAllVehicles();
  }

  @ApiOperation({ summary: 'Get a vehicle by ID (Redis cached)' })
  @ApiResponse({ status: 200, description: 'Vehicle found' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @Get(':id')
  findOneVehicle(@Param('id') id: string): Promise<Vehicle> {
    return this.vehiclesQueryService.findOneVehicle(id);
  }

  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle updated' })
  @ApiResponse({ status: 404, description: 'Vehicle or model not found' })
  @Patch(':id')
  updateVehicle(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Vehicle> {
    return this.vehiclesRegistrationService.updateVehicle(id, dto, req.user.sub);
  }

  @ApiOperation({ summary: 'Remove a vehicle' })
  @ApiResponse({ status: 204, description: 'Vehicle removed' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  removeVehicle(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.vehiclesRegistrationService.removeVehicle(id, req.user.sub);
  }
}
