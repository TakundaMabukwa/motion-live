import { VehicleIp } from '@/lib/types/database/vehicle';
import { CreateVehicleIpRequest } from '@/lib/types/api/vehicle';

/**
 * Repository for interacting with vehicle data in the database
 */
export class VehicleRepository {
  /**
   * Find a vehicle by VIN number
   * @param vin The VIN number to search for
   * @returns The vehicle or null if not found
   */
  async findByVin(vin: string): Promise<VehicleIp | null> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('vin_number', vin.trim())
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data as VehicleIp;
  }
  
  /**
   * Find a vehicle by registration number
   * @param registration The registration number to search for
   * @returns The vehicle or null if not found
   */
  async findByRegistration(registration: string): Promise<VehicleIp | null> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('new_registration', registration.trim())
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data as VehicleIp;
  }
  
  /**
   * Find vehicles by company name
   * @param company The company name to filter by
   * @returns Array of vehicles
   */
  async findByCompany(company: string): Promise<VehicleIp[]> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    // First try exact match with account number
    let { data, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('new_account_number', company.trim());
    
    if ((data?.length === 0 || !data) && !error) {
      // If no results with account number, try partial match with company name
      ({ data, error } = await supabase
        .from('vehicles_ip')
        .select('*')
        .ilike('company', `%${company.trim()}%`));
    }
      
    if (error) {
      throw error;
    }
    
    return data as VehicleIp[];
  }
  
  /**
   * Get all vehicles
   * @param limit Optional limit on number of results
   * @param offset Optional offset for pagination
   * @returns Array of vehicles
   */
  async findAll(limit?: number, offset?: number): Promise<VehicleIp[]> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    let query = supabase
      .from('vehicles_ip')
      .select('*')
      .eq('active', true);
      
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }
    
    const { data, error } = await query;
      
    if (error) {
      throw error;
    }
    
    return data as VehicleIp[];
  }

  /**
   * Create a new vehicle in the vehicles_ip table
   * @param vehicleData The vehicle data to insert
   * @returns The created vehicle
   */
  async create(vehicleData: CreateVehicleIpRequest): Promise<VehicleIp> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('vehicles_ip')
      .insert(vehicleData)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return data as VehicleIp;
  }

  /**
   * Filter vehicles by registration and/or account number
   * @param registration Optional registration number to filter by (partial match)
   * @param accountNumber Optional account number to filter by (partial match)
   * @returns Array of vehicles matching the filters
   */
  async filter(registration?: string, accountNumber?: string): Promise<VehicleIp[]> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    let query = supabase
      .from('vehicles_ip')
      .select('*')
      .order('id', { ascending: false });

    // Apply filters if provided
    if (registration) {
      query = query.ilike('new_registration', `%${registration}%`);
    }
    if (accountNumber) {
      query = query.ilike('new_account_number', `%${accountNumber}%`);
    }

    const { data, error } = await query;
      
    if (error) {
      throw error;
    }
    
    return data as VehicleIp[];
  }
  
  /**
   * Find vehicles by exact account number
   * @param accountNumber The account number to match
   * @returns Array of vehicles for the account
   */
  async findByAccountNumber(accountNumber: string): Promise<VehicleIp[]> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('new_account_number', accountNumber);
      
    if (error) {
      throw error;
    }
    
    return data as VehicleIp[];
  }
  
  /**
   * Create test vehicles for an account
   * @param accountNumber The account number for the test vehicles
   * @returns The created vehicles
   */
  async createTestVehicles(accountNumber: string): Promise<VehicleIp[]> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    // Create test vehicles
    const testVehicles = [
      {
        new_account_number: accountNumber,
        group_name: 'TEST001',
        new_registration: 'TEST001',
        beame_1: 'Toyota',
        beame_2: 'Hilux',
        beame_3: '2020',
        company: 'Test Company',
        active: true,
        products: ['GPS', 'Tracker']
      },
      {
        new_account_number: accountNumber,
        group_name: 'TEST002',
        new_registration: 'TEST002',
        beame_1: 'Ford',
        beame_2: 'Ranger',
        beame_3: '2021',
        company: 'Test Company',
        active: true,
        products: ['GPS', 'Tracker']
      }
    ];

    const { data, error } = await supabase
      .from('vehicles_ip')
      .insert(testVehicles)
      .select('*');
      
    if (error) {
      throw error;
    }
    
    return data as VehicleIp[];
  }
}
