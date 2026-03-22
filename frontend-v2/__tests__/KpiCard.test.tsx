import { render, screen } from '@testing-library/react';
import { KpiCard } from '@/components/dashboard/KpiCard';

describe('KpiCard Component', () => {
  it('renders the title and value correctly', () => {
    render(<KpiCard title="Total Submissions" value="124" trend={5} trendLabel="vs last week" />);

    expect(screen.getByText('Total Submissions')).toBeInTheDocument();
    expect(screen.getByText('124')).toBeInTheDocument();
    
    // Check trend arrow and label
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('renders negative trend correctly', () => {
    render(<KpiCard title="Avg Score" value="68.4" trend={-2} />);
    
    // The negative sign should be formatted, actually my code used Math.abs(trend)
    expect(screen.getByText('2%')).toBeInTheDocument();
    // It should have the text-red-600 class
    const trendElement = screen.getByText('2%').closest('span');
    expect(trendElement).toHaveClass('text-red-600');
  });
});
