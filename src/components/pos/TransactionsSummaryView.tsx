import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SlipSummaryDashboard from './SlipSummaryDashboard';
import TransactionsMasterlist from './TransactionsMasterlist';
import { ArrowLeft } from 'lucide-react';
import { BranchConfig } from './useSalesEngine';

interface TransactionsSummaryViewProps {
  branchId: string;
  branchConfig: BranchConfig | null;
  onBack: () => void;
  onDayCloseChange: (closed: boolean) => void;
}

const TransactionsSummaryView = ({ branchId, branchConfig, onBack, onDayCloseChange }: TransactionsSummaryViewProps) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-4 px-6 pt-6 pb-2">
        <button
          onClick={onBack}
          className="h-10 px-4 bg-primary text-primary-foreground rounded-lg font-display font-semibold text-sm flex items-center gap-2 active:scale-[0.97] transition-transform"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="font-display text-2xl font-bold text-foreground">Transactions Summary</h1>
      </div>
      <Tabs defaultValue="slips" className="flex-1 flex flex-col overflow-hidden px-6">
        <TabsList className="w-fit mb-4">
          <TabsTrigger value="slips" className="font-display font-semibold text-sm">Slips</TabsTrigger>
          <TabsTrigger value="sales" className="font-display font-semibold text-sm">Sales</TabsTrigger>
        </TabsList>
        <TabsContent value="slips" className="flex-1 overflow-y-auto mt-0">
          <SlipSummaryDashboard
            branchId={branchId}
            onBack={onBack}
            onDayCloseChange={onDayCloseChange}
            embedded
          />
        </TabsContent>
        <TabsContent value="sales" className="flex-1 overflow-y-auto mt-0">
          <TransactionsMasterlist onBack={onBack} branchConfig={branchConfig} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransactionsSummaryView;
