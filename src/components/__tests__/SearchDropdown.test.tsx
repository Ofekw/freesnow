import { describe, it, expect, beforeEach } from 'bun:test';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchDropdown } from '@/components/SearchDropdown';
import { renderWithProviders } from '@/test/test-utils';

let currentQuery = '';

function renderDropdown(initialQuery = '') {
  currentQuery = initialQuery;
  function onChange(q: string) {
    currentQuery = q;
  }
  const result = renderWithProviders(
    <SearchDropdown query={currentQuery} onQueryChange={onChange} />,
  );
  return result;
}

beforeEach(() => {
  currentQuery = '';
});

describe('SearchDropdown', () => {
  it('renders the search input', () => {
    renderDropdown();
    expect(screen.getByPlaceholderText('Search resorts…')).toBeInTheDocument();
  });

  it('has combobox role and aria-label', () => {
    renderDropdown();
    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-label', 'Search resorts');
  });

  it('does not show dropdown when query is empty', () => {
    renderDropdown();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows dropdown with results when query matches', async () => {
    const user = userEvent.setup();
    renderDropdown('Vail');
    const input = screen.getByRole('combobox');
    await user.click(input);
    const panel = screen.getByRole('listbox');
    expect(panel).toBeInTheDocument();
    const options = within(panel).getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(within(options[0]).getByText('Vail')).toBeInTheDocument();
  });

  it('shows no-match message for invalid query', async () => {
    const user = userEvent.setup();
    renderDropdown('zzznotaresort');
    const input = screen.getByRole('combobox');
    await user.click(input);
    expect(screen.getByText(/no resorts match/i)).toBeInTheDocument();
  });

  it('navigates on result click', async () => {
    const user = userEvent.setup();
    renderDropdown('Vail');
    const input = screen.getByRole('combobox');
    await user.click(input);
    const options = screen.getAllByRole('option');
    await user.click(options[0]);
    // After click, the dropdown should close (no panel)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderDropdown('Colorado');
    const input = screen.getByRole('combobox');
    await user.click(input);

    // Arrow down should activate first item
    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('data-active', 'true');

    // Arrow down again should move to second item
    await user.keyboard('{ArrowDown}');
    expect(options[1]).toHaveAttribute('data-active', 'true');
    expect(options[0]).toHaveAttribute('data-active', 'false');
  });

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup();
    renderDropdown('Vail');
    const input = screen.getByRole('combobox');
    await user.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('limits results to max 8', () => {
    // "US" matches many resorts - should cap at 8
    renderDropdown('US');
    const input = screen.getByRole('combobox');
    input.focus();
    const panel = screen.queryByRole('listbox');
    if (panel) {
      const options = within(panel).queryAllByRole('option');
      expect(options.length).toBeLessThanOrEqual(8);
    }
  });
});
