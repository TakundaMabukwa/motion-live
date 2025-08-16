import { VehicleRepository } from '@/lib/repositories/vehicle-repository';
import { VehicleIp } from '@/lib/types/database/vehicle';
import { 
  SearchVehicleRequest, 
  CreateVehicleIpRequest, 
  CreateVehicleIpSchema, 
  GetVehiclesIpRequest,
  TransformedVehicle
} from '@/lib/types/api/vehicle';
import { BadRequestError } from '@/lib/errors';
import { Cache } from '@/lib/cache/memory-cache';
import { Logger } from '@/lib/logger';
import { safeValidate } from '@/lib/api/validation';

/**
 * Service for vehicle-related business logic
 */
export class VehicleService {
  private repository: VehicleRepository;
  private cache: Cache;
  private logger: Logger;
  
  constructor() {
    this.repository = new VehicleRepository();
    this.cache = Cache.getInstance();
    this.logger = new Logger('VehicleService');
  }
  
  /**
   * Search for a vehicle by VIN or registration
   * @param params Search parameters containing VIN or registration
   * @returns Vehicle data and optional message
   */
  async searchVehicle(params: SearchVehicleRequest): Promise<{ vehicle: VehicleIp | null; message?: string }> {
    try {
      if (!params.vin && !params.registration) {
        this.logger.warn('Search attempted without VIN or registration');
        throw new BadRequestError('Either VIN or registration number is required');
      }
      
      let vehicle: VehicleIp | null = null;
      let cacheKey: string | null = null;
      
      if (params.vin) {
        this.logger.debug(`Searching for vehicle by VIN: ${params.vin}`);
        cacheKey = `vehicle:vin:${params.vin}`;
        vehicle = this.cache.get<VehicleIp>(cacheKey);
        
        if (!vehicle) {
          this.logger.debug(`Cache miss for VIN: ${params.vin}, fetching from database`);
          vehicle = await this.repository.findByVin(params.vin);
          if (vehicle) {
            this.cache.set(cacheKey, vehicle, { ttl: 30 * 60 * 1000 }); // Cache for 30 minutes
            this.logger.debug(`Cached vehicle with VIN: ${params.vin}`);
          }
        } else {
          this.logger.debug(`Cache hit for VIN: ${params.vin}`);
        }
      } else if (params.registration) {
        this.logger.debug(`Searching for vehicle by registration: ${params.registration}`);
        cacheKey = `vehicle:reg:${params.registration}`;
        vehicle = this.cache.get<VehicleIp>(cacheKey);
        
        if (!vehicle) {
          this.logger.debug(`Cache miss for registration: ${params.registration}, fetching from database`);
          vehicle = await this.repository.findByRegistration(params.registration);
          if (vehicle) {
            this.cache.set(cacheKey, vehicle, { ttl: 30 * 60 * 1000 }); // Cache for 30 minutes
            this.logger.debug(`Cached vehicle with registration: ${params.registration}`);
          }
        } else {
          this.logger.debug(`Cache hit for registration: ${params.registration}`);
        }
      }
      
      if (!vehicle) {
        this.logger.info('Vehicle not found', { vin: params.vin, registration: params.registration });
        return { vehicle: null, message: 'Vehicle not found' };
      }
      
      this.logger.info('Vehicle found', { 
        id: vehicle.id,
        company: vehicle.company,
        account: vehicle.new_account_number
      });
      return { vehicle };
    } catch (error) {
      this.logger.error('Error searching for vehicle', error as Error, { 
        vin: params.vin,
        registration: params.registration
      });
      throw error;
    }
  }
  
  /**
   * Get vehicles by company name
   * @param company The company name to filter by
   * @returns Array of vehicles
   */
  async getVehiclesByCompany(company: string): Promise<VehicleIp[]> {
    try {
      if (!company) {
        this.logger.warn('Get vehicles by company called without company name');
        throw new BadRequestError('Company name is required');
      }
      
      this.logger.debug(`Getting vehicles for company: ${company}`);
      const cacheKey = `vehicles:company:${company}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for company: ${company}, fetching from database`);
          const vehicles = await this.repository.findByCompany(company);
          this.logger.info(`Found ${vehicles.length} vehicles for company: ${company}`);
          return vehicles;
        },
        { ttl: 15 * 60 * 1000 } // Cache for 15 minutes
      );
    } catch (error) {
      this.logger.error(`Error getting vehicles for company: ${company}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Get all vehicles with optional pagination
   * @param limit Optional limit on number of results
   * @param offset Optional offset for pagination
   * @returns Array of vehicles
   */
  async getAllVehicles(limit?: number, offset?: number): Promise<VehicleIp[]> {
    try {
      this.logger.debug('Getting all vehicles', { limit, offset });
      const cacheKey = `vehicles:all:${limit || 'all'}:${offset || 0}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for all vehicles, fetching from database', { limit, offset });
          const vehicles = await this.repository.findAll(limit, offset);
          this.logger.info(`Found ${vehicles.length} vehicles`, { limit, offset });
          return vehicles;
        },
        { ttl: 10 * 60 * 1000 } // Cache for 10 minutes
      );
    } catch (error) {
      this.logger.error('Error getting all vehicles', error as Error, { limit, offset });
      throw error;
    }
  }
  
  /**
   * Create a new vehicle in the vehicles_ip table
   * @param vehicleData The vehicle data to insert
   * @returns The created vehicle with success message
   */
  async createVehicleIp(vehicleData: CreateVehicleIpRequest): Promise<{ success: boolean; vehicle: VehicleIp; message: string }> {
    try {
      this.logger.debug('Creating new vehicle', { 
        registration: vehicleData.new_registration,
        account: vehicleData.new_account_number
      });
      
      // Validate vehicle data
      const validation = safeValidate(vehicleData, CreateVehicleIpSchema);
      if (!validation.success) {
        this.logger.warn('Invalid vehicle data', { errors: validation.error.issues });
        throw new BadRequestError(`Invalid vehicle data: ${validation.error.message}`);
      }
      
      // Set default values if not provided
      if (!vehicleData.company && vehicleData.new_account_number) {
        vehicleData.company = vehicleData.new_account_number;
      }
      
      // Create the vehicle
      const vehicle = await this.repository.create(vehicleData);
      
      // Invalidate relevant caches
      this.cache.delete(`vehicle:reg:${vehicleData.new_registration}`);
      if (vehicleData.vin_number) {
        this.cache.delete(`vehicle:vin:${vehicleData.vin_number}`);
      }
      this.cache.delete(`vehicles:company:${vehicleData.company || vehicleData.new_account_number}`);
      this.cache.delete(`vehicles:all:all:0`); // Invalidate cache for all vehicles
      
      this.logger.info('Vehicle created successfully', { 
        id: vehicle.id, 
        registration: vehicle.new_registration
      });
      
      return {
        success: true,
        vehicle,
        message: 'Vehicle added to vehicles_ip successfully'
      };
    } catch (error) {
      this.logger.error('Error creating vehicle', error as Error, { 
        registration: vehicleData.new_registration,
        account: vehicleData.new_account_number
      });
      throw error;
    }
  }
  
  /**
   * Get vehicles filtered by registration and/or account number
   * @param params Filter parameters
   * @returns Filtered vehicles with total count
   */
  async getVehiclesIp(params: GetVehiclesIpRequest): Promise<{ vehicles: VehicleIp[]; total: number }> {
    try {
      this.logger.debug('Filtering vehicles', { 
        registration: params.registration,
        accountNumber: params.accountNumber
      });
      
      const cacheKey = `vehicles:filter:${params.registration || ''}:${params.accountNumber || ''}`;
      
      const vehicles = await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for filtered vehicles, fetching from database');
          return await this.repository.filter(params.registration, params.accountNumber);
        },
        { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
      );
      
      this.logger.info(`Found ${vehicles.length} vehicles matching filters`, {
        registration: params.registration,
        accountNumber: params.accountNumber
      });
      
      return {
        vehicles,
        total: vehicles.length
      };
    } catch (error) {
      this.logger.error('Error filtering vehicles', error as Error, { 
        registration: params.registration,
        accountNumber: params.accountNumber
      });
      throw error;
    }
  }
  
  /**
   * Get vehicles by account number and transform them for client display
   * @param accountNumber The account number to filter by
   * @returns Transformed vehicles with count
   */
  async getVehiclesByAccount(accountNumber: string): Promise<{ vehicles: TransformedVehicle[]; count: number }> {
    try {
      if (!accountNumber) {
        this.logger.warn('Get vehicles by account called without account number');
        throw new BadRequestError('Account number is required');
      }
      
      this.logger.debug(`Getting vehicles for account: ${accountNumber}`);
      const cacheKey = `vehicles:account:${accountNumber}`;
      
      const vehicles = await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug(`Cache miss for account: ${accountNumber}, fetching from database`);
          return await this.repository.findByAccountNumber(accountNumber);
        },
        { ttl: 10 * 60 * 1000 } // Cache for 10 minutes
      );
      
      // Transform the data to match expected format
      const transformedVehicles = vehicles.map(vehicle => ({
        id: vehicle.id,
        plate_number: vehicle.new_registration || vehicle.group_name || '',
        vehicle_make: vehicle.beame_1 || '',
        vehicle_model: vehicle.beame_2 || '',
        vehicle_year: vehicle.beame_3 || '',
        ip_address: vehicle.ip_address || '',
        company: vehicle.company || '',
        comment: vehicle.comment || '',
        products: vehicle.products || [],
        active: vehicle.active,
        group_name: vehicle.group_name || null,
        new_account_number: vehicle.new_account_number
      }));
      
      this.logger.info(`Found ${vehicles.length} vehicles for account: ${accountNumber}`);
      
      return {
        vehicles: transformedVehicles,
        count: transformedVehicles.length
      };
    } catch (error) {
      this.logger.error(`Error getting vehicles for account: ${accountNumber}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Create test vehicles for an account
   * @param accountNumber The account number for the test vehicles
   * @returns The created vehicles and a message
   */
  async createTestVehicles(accountNumber: string): Promise<{ message: string; vehicles: VehicleIp[] }> {
    try {
      if (!accountNumber) {
        this.logger.warn('Create test vehicles called without account number');
        throw new BadRequestError('Account number is required');
      }
      
      this.logger.debug(`Creating test vehicles for account: ${accountNumber}`);
      
      const vehicles = await this.repository.createTestVehicles(accountNumber);
      
      // Invalidate relevant caches
      this.cache.delete(`vehicles:account:${accountNumber}`);
      this.cache.delete(`vehicles:company:${accountNumber}`);
      this.cache.delete(`vehicles:all:all:0`);
      
      this.logger.info(`Created ${vehicles.length} test vehicles for account: ${accountNumber}`);
      
      return {
        message: 'Test vehicles created successfully',
        vehicles
      };
    } catch (error) {
      this.logger.error(`Error creating test vehicles for account: ${accountNumber}`, error as Error);
      throw error;
    }
  }
}
