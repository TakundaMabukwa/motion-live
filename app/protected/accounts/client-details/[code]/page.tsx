'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientCostCentersPage() {
  const params = useParams();
  const router = useRouter();
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const clientCode = params.code;

  useEffect(() => {
    const fetchCostCenters = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cost-centers?prefix=${encodeURIComponent(String(clientCode || ''))}`);

        if (!response.ok) {
          throw new Error('Failed to fetch cost centers');
        }

        const data = await response.json();
        setCostCenters(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching cost centers:', err);
        setError(err.message || 'Failed to load cost centers');
        toast.error('Failed to load cost centers');
      } finally {
        setLoading(false);
      }
    };

    if (clientCode) {
      fetchCostCenters();
    }
  }, [clientCode]);

  const filteredCostCenters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return costCenters;
    return costCenters.filter((center) => {
      const code = String(center.cost_code || '').toLowerCase();
      const company = String(center.company || '').toLowerCase();
      return code.includes(term) || company.includes(term);
    });
  }, [costCenters, searchTerm]);

  const groupedCostCenters = useMemo(() => {
    const groups = new Map();
    filteredCostCenters.forEach((center) => {
      const code = String(center.cost_code || '');
      const prefix = code.split('-')[0] || 'UNKNOWN';
      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      groups.get(prefix).push(center);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([prefix, centers]) => ({
        prefix,
        centers: centers.sort((a, b) => String(a.cost_code || '').localeCompare(String(b.cost_code || '')))
      }));
  }, [filteredCostCenters]);

  const totalValidated = useMemo(() => costCenters.filter((center) => center.validated).length, [costCenters]);
  const totalCompanies = useMemo(() => new Set(costCenters.map((center) => center.company).filter(Boolean)).size, [costCenters]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
        <span className="ml-2">Loading cost centers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-600 text-xl">Error: {error}</div>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Clients
          </Button>
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">Client Cost Centers: {clientCode}</h1>
            <p className="text-gray-600">Grouped by cost code prefix</p>
          </div>
        </div>
      </div>

      <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Cost Centers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-blue-600 text-2xl">{costCenters.length}</div>
            <p className="text-muted-foreground text-xs">All cost centers found</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Validated</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-green-600 text-2xl">{totalValidated}</div>
            <p className="text-muted-foreground text-xs">Marked as validated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Companies</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-purple-600 text-2xl">{totalCompanies}</div>
            <p className="text-muted-foreground text-xs">Unique companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Groups</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-indigo-600 text-2xl">{groupedCostCenters.length}</div>
            <p className="text-muted-foreground text-xs">Prefix groups</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Cost Centers</CardTitle>
          <p className="text-gray-600 text-sm">Filter by cost code or company name</p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
            <Input
              type="text"
              placeholder="Search cost codes or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {groupedCostCenters.map((group) => (
        <Card key={group.prefix}>
          <CardHeader>
            <CardTitle className="text-lg">Group: {group.prefix}</CardTitle>
            <p className="text-gray-600 text-sm">{group.centers.length} cost center(s)</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Cost Code</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">Validated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.centers.map((center, index) => (
                    <tr key={center.id || `${group.prefix}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{center.cost_code || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{center.company || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge variant={center.validated ? 'default' : 'outline'}>
                          {center.validated ? 'Validated' : 'Pending'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {groupedCostCenters.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
            <h3 className="mb-2 font-medium text-gray-900 text-lg">No cost centers found</h3>
            <p className="text-gray-500">Try adjusting your search or check the cost center records.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
