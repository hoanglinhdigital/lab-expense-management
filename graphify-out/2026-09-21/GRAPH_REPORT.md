# Graph Report - src  (2026-09-21)

## Corpus Check
- Corpus is ~49,708 words - fits in a single context window. You may not need a graph.

## Summary
- 1054 nodes · 3074 edges · 47 communities (46 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Category Breakdown UI
- Day Calendar Modal
- Account Form Panel
- Auth Pages
- Account & Category CRUD Routes
- Report API Routes
- Constants & Enums
- Category Schema
- Auth & Profile Routes
- Currency & Transaction Schemas
- Transaction Detail Forms
- Auth Layout & Panels
- API Error Helpers
- Datetime Utilities
- Login & API Handler
- Settings Screen
- Transaction Detail Screen
- Flow Detail Screen
- Contact Serializer
- Account Screen
- Record Form Fields
- Formatting Helpers
- Account Balance Routes
- Confirm Dialogs
- Expense Analysis Charts
- Pagination & Account Service
- Cron & Expense-vs-Income
- History Screen
- Home & Account Sheets
- Report Screen
- Bottom Sheets
- Expense Analysis Service
- Record Client
- Record Header
- Home Balance Header
- Home Client
- Contact Routes
- Income Expense Bars
- Navigation
- Category Donut & Flow Summary
- Transaction Serializer
- Setting Menu
- Loan Summary
- Exchange Rate Card
- Decimal Utils
- Root Layout
- Screen Placeholder

## God Nodes (most connected - your core abstractions)
1. `ok()` - 48 edges
2. `formatCurrency()` - 33 edges
3. `parseQuery()` - 32 edges
4. `withAuth()` - 25 edges
5. `parseJsonBody()` - 25 edges
6. `toDecimal()` - 25 edges
7. `isUnauthorized()` - 22 edges
8. `toAmountString()` - 22 edges
9. `RecordScreen()` - 21 edges
10. `amountToNumber()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `FlowRow()` --calls--> `formatCurrency()`  [EXTRACTED]
  app/components/home/FlowSummaryCard.tsx → lib/format.ts
- `CategoryGroup` --references--> `CategoryOption`  [EXTRACTED]
  app/components/record/CategorySheet.tsx → lib/record-types.ts
- `FlowRow()` --calls--> `formatCurrency()`  [EXTRACTED]
  app/components/report/ExpenseIncomeCard.tsx → lib/format.ts
- `GET` --calls--> `ok()`  [EXTRACTED]
  app/api/accounts/[accountId]/balance/route.ts → lib/api/response.ts
- `GET` --calls--> `parseQuery()`  [EXTRACTED]
  app/api/accounts/[accountId]/balance/route.ts → lib/api/validation.ts

## Import Cycles
- None detected.

## Communities (47 total, 1 thin omitted)

### Community 0 - "Category Breakdown UI"
Cohesion: 0.05
Nodes (63): CategoryBreakdownList(), CategoryBreakdownListProps, CategoryBreakdownRow(), CategoryBreakdownRowProps, RowBody(), CategoryChildAccordion(), toggle(), CategoryChildAccordionProps (+55 more)

### Community 1 - "Day Calendar Modal"
Cohesion: 0.07
Nodes (55): DayCalendarModal(), DayCalendarModalProps, MONTH_SHORT_NAMES, WEEKDAY_HEADERS, DayModalContext, HistoryPeriodScreen(), apply(), QUARTER_LABELS (+47 more)

### Community 2 - "Account Form Panel"
Cohesion: 0.07
Nodes (42): AccountFormPanel(), submit(), validate(), AccountGroupCard(), AccountGroupCardProps, AccountHeader(), AccountHeaderProps, AccountListRow() (+34 more)

### Community 3 - "Auth Pages"
Cohesion: 0.10
Nodes (27): metadata, metadata, AuthCard(), AuthCardProps, AuthSubmitButton(), AuthSubmitButtonProps, AuthTextField(), AuthTextFieldProps (+19 more)

### Community 4 - "Account & Category CRUD Routes"
Cohesion: 0.12
Nodes (28): DELETE, GET, Params, PATCH, POST, DELETE, GET, Params (+20 more)

### Community 5 - "Report API Routes"
Cohesion: 0.10
Nodes (23): GET, GET, GET, GET, GET, GET, GET, GET (+15 more)

### Community 6 - "Constants & Enums"
Cohesion: 0.13
Nodes (28): generated_prisma_enums, generated_prisma_enums_accounttype, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ORDER, DEFAULT_TIMEZONE, REPORT_PERIOD_IDS, REPORT_PERIOD_LABELS, ReportPeriodId (+20 more)

### Community 7 - "Category Schema"
Cohesion: 0.13
Nodes (28): generated_prisma_enums_categoryscope, generated_prisma_enums_categorytype, categoryNotFound(), colorSchema, CreateCategoryInput, createCategorySchema, iconSchema, ListCategoriesQuery (+20 more)

### Community 8 - "Auth & Profile Routes"
Cohesion: 0.13
Nodes (24): POST, GET, PATCH, POST, emailSchema, LoginInput, nameSchema, passwordSchema (+16 more)

### Community 9 - "Currency & Transaction Schemas"
Cohesion: 0.11
Nodes (24): GET, paginationSchema(), ExchangeRateQuery, ListCurrenciesQuery, listCurrenciesQuerySchema, baseFields, flowSchema(), forbiddenField() (+16 more)

### Community 10 - "Transaction Detail Forms"
Cohesion: 0.10
Nodes (15): Overlay, Status, BorrowLendForm(), CategoryFormPanel(), ContactCreateDialog(), ContactSheet(), ContactSheetProps, ExpenseIncomeForm() (+7 more)

### Community 11 - "Auth Layout & Panels"
Cohesion: 0.13
Nodes (16): AuthBrandHeader(), FullScreenPanel(), FullScreenPanelProps, CategoryFormPanelProps, SubPanel, CategoryPickerCardProps, CategoryTile(), CategoryTileProps (+8 more)

### Community 12 - "API Error Helpers"
Cohesion: 0.17
Nodes (24): accountNotFound(), ApiError, conflict(), contactNotFound(), ErrorDetails, forbidden(), internalError(), notFound() (+16 more)

### Community 13 - "Datetime Utilities"
Cohesion: 0.21
Nodes (25): assertValidTimezone(), endOfDay(), endOfMonth(), endOfWeek(), endOfYear(), formatMonthKey(), formatterCache, getFormatter() (+17 more)

### Community 14 - "Login & API Handler"
Cohesion: 0.13
Nodes (20): POST, GET, AuthedHandler, Context, PublicHandler, withApi(), withAuth(), toErrorResponse() (+12 more)

### Community 15 - "Settings Screen"
Cohesion: 0.15
Nodes (17): SettingHeader(), SettingHeaderProps, SettingScreen(), confirmLogout(), SettingSkeleton(), SettingTileGroup(), SettingTileGroupProps, fetchUserProfile() (+9 more)

### Community 16 - "Transaction Detail Screen"
Cohesion: 0.19
Nodes (24): TransactionDetailScreen(), handleCreateCategory(), handleCreateContact(), handleDelete(), submit(), updateField(), validate(), withConvertedAmount() (+16 more)

### Community 17 - "Flow Detail Screen"
Cohesion: 0.14
Nodes (15): FlowDetailScreen(), FlowDetailSkeleton(), FlowPeriodTabs(), FlowPeriodTabsProps, fetchFlowDetail(), fetchReportOverview(), loadOverviewDto(), PeriodFlowDto (+7 more)

### Community 18 - "Contact Serializer"
Cohesion: 0.18
Nodes (21): ContactDto, ContactRecord, contactRefSelect, contactSelect, ContactTotals, toContactDto(), ZERO, convert() (+13 more)

### Community 19 - "Account Screen"
Cohesion: 0.16
Nodes (15): AccountKindSheetProps, AccountScreen(), handleCreate(), reload(), AccountSkeleton(), AccountDto, AccountGroupDto, AccountResponse (+7 more)

### Community 20 - "Record Form Fields"
Cohesion: 0.27
Nodes (12): AccountRow(), AdjustmentForm(), AmountField(), AmountFieldProps, CategoryPickerCard(), DateTimeRow(), DateTimeRowProps, DescriptionRow() (+4 more)

### Community 21 - "Formatting Helpers"
Cohesion: 0.16
Nodes (18): createInitialForm(), toDecimal(), formatDateLabel(), NUMBER_FORMATTER, pad(), toDateInputValue(), toDateTime(), toTimeInputValue() (+10 more)

### Community 22 - "Account Balance Routes"
Cohesion: 0.12
Nodes (16): GET, Params, GET, ACCOUNT_TYPES, accountBalanceQuerySchema, accountSummaryQuerySchema, CreateAccountInput, createAccountSchema (+8 more)

### Community 23 - "Confirm Dialogs"
Cohesion: 0.13
Nodes (10): DeleteTransactionDialog(), DeleteTransactionDialogProps, ContactCreateDialogProps, LogoutConfirmDialog(), LogoutConfirmDialogProps, ApiClientError, ApiErrorBody, apiFetch() (+2 more)

### Community 24 - "Expense Analysis Charts"
Cohesion: 0.18
Nodes (15): ExpenseAnalysisCard(), ExpenseAnalysisCardProps, monthYear(), rangeLabel(), axisStep(), monthLabel(), MonthlyExpenseChart(), MonthlyExpenseChartProps (+7 more)

### Community 25 - "Pagination & Account Service"
Cohesion: 0.19
Nodes (16): currencyNotSupported(), buildMeta(), paginateArray(), PaginationMeta, toSkipTake(), listAccounts(), toOrderBy(), assertCurrencySupported() (+8 more)

### Community 26 - "Cron & Expense-vs-Income"
Cohesion: 0.14
Nodes (11): dynamic, runtime, GET, monthRange(), querySchema, generated_prisma_client_prismaclient, resolveDatabaseUrl(), adapter (+3 more)

### Community 27 - "History Screen"
Cohesion: 0.18
Nodes (11): HistoryHeader(), HistoryHeaderProps, HistoryScreen(), loadMore(), HistorySkeleton(), PeriodSelectorButton(), PeriodSelectorButtonProps, isUnauthorized() (+3 more)

### Community 28 - "Home & Account Sheets"
Cohesion: 0.15
Nodes (9): AccountFormPanelProps, Sheet, AccountKindSheet(), FormAlert(), FormAlertProps, HomeScreen(), HomeSkeleton(), metadata (+1 more)

### Community 29 - "Report Screen"
Cohesion: 0.16
Nodes (8): ReportScreen(), ReportShortcutGrid(), ReportShortcutGridProps, ReportSkeleton(), REPORT_SHORTCUTS, AUTH_PATHS, config, ref_next

### Community 30 - "Bottom Sheets"
Cohesion: 0.18
Nodes (10): BottomSheet(), BottomSheetProps, AccountRowProps, AccountSheet(), AccountSheetProps, CategoryGroup, CategorySheet(), hasChildren() (+2 more)

### Community 31 - "Expense Analysis Service"
Cohesion: 0.32
Nodes (15): toAmountString(), toDecimal(), expandCategoryIds(), loadRootCategoryMap(), accountFilter(), convertFrom(), getExpenseAnalysis(), getExpenseByCategory() (+7 more)

### Community 32 - "Record Client"
Cohesion: 0.20
Nodes (13): CategorySheetProps, AccountDto, CategoryDto, ContactDto, CreateCategoryInput, ExchangeRateDto, fetchRecordOptions(), toAccountOption() (+5 more)

### Community 33 - "Record Header"
Cohesion: 0.24
Nodes (10): RecordHeader(), RecordHeaderProps, handleTypeChange(), TransactionTypeMenu(), TransactionTypeMenuProps, getRecordTypeConfig(), RECORD_TYPES, RecordFieldErrors (+2 more)

### Community 34 - "Home Balance Header"
Cohesion: 0.27
Nodes (10): BalanceCard(), BalanceCardProps, HomeHeader(), HomeHeaderProps, initial(), BalanceSummary, DONUT_COLORS, LoanKind (+2 more)

### Community 35 - "Home Client"
Cohesion: 0.18
Nodes (12): CategoryBreakdownResponse, ExchangeRateResponse, ExpenseVsIncomeResponse, fetchHomeOverview(), LoanDto, MeResponse, MoneyLendBorrowResponse, MonthlySummaryResponse (+4 more)

### Community 36 - "Contact Routes"
Cohesion: 0.20
Nodes (10): GET, CreateContactInput, createContactSchema, emailSchema, ListContactsQuery, listContactsQuerySchema, nameSchema, noteSchema (+2 more)

### Community 37 - "Income Expense Bars"
Cohesion: 0.26
Nodes (10): heightPercent(), IncomeExpenseBars(), IncomeExpenseBarsProps, toMillionLabel(), ExpenseIncomeCard(), ExpenseIncomeCardProps, FlowRow(), FlowRowProps (+2 more)

### Community 38 - "Navigation"
Cohesion: 0.40
Nodes (5): BottomTabBar(), isNavItemActive(), NAV_ITEMS, NavItem, Sidebar()

### Community 39 - "Category Donut & Flow Summary"
Cohesion: 0.31
Nodes (8): CategoryDonut(), CategoryDonutProps, FlowRow(), FlowRowProps, FlowSummaryCard(), FlowSummaryCardProps, CategorySlice, donutColor()

### Community 40 - "Transaction Serializer"
Cohesion: 0.33
Nodes (9): generated_prisma_enums_transactiontype, AccountRefDto, accountRefSelect, CategoryRefDto, categoryRefSelect, ContactRefDto, TransactionDto, TransactionRecord (+1 more)

### Community 41 - "Setting Menu"
Cohesion: 0.36
Nodes (7): SettingMenuList(), SettingMenuListProps, renderDescription(), SettingMenuRow(), SettingMenuRowProps, SETTING_MENU, SettingMenuItem

### Community 42 - "Loan Summary"
Cohesion: 0.43
Nodes (6): LoanRow(), LoanRowProps, LoanSummaryCard(), LoanSummaryCardProps, formatDate(), LoanItem

### Community 43 - "Exchange Rate Card"
Cohesion: 0.48
Nodes (5): ExchangeRateCard(), ExchangeRateCardProps, ExchangeRateRow(), ExchangeRateRowProps, ExchangeRate

### Community 44 - "Decimal Utils"
Cohesion: 0.29
Nodes (5): generated_prisma_client, generated_prisma_client_prisma, DecimalInput, sumDecimals(), toPercentage()

### Community 45 - "Root Layout"
Cohesion: 0.33
Nodes (4): app_globals, geistMono, geistSans, metadata

## Knowledge Gaps
- **159 isolated node(s):** `metadata`, `metadata`, `metadata`, `metadata`, `Params` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 227 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `Cron & Expense-vs-Income` to `Constants & Enums`, `Category Schema`, `Auth & Profile Routes`, `API Error Helpers`, `Datetime Utilities`, `Login & API Handler`, `Contact Serializer`, `Pagination & Account Service`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `isUnauthorized()` connect `History Screen` to `Category Breakdown UI`, `Transaction Detail Forms`, `Settings Screen`, `Transaction Detail Screen`, `Flow Detail Screen`, `Account Screen`, `Confirm Dialogs`, `Home & Account Sheets`, `Report Screen`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `metadata` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Category Breakdown UI` be split into smaller, more focused modules?**
  _Cohesion score 0.051685393258426963 - nodes in this community are weakly interconnected._
- **Should `Day Calendar Modal` be split into smaller, more focused modules?**
  _Cohesion score 0.06533646322378717 - nodes in this community are weakly interconnected._
- **Should `Account Form Panel` be split into smaller, more focused modules?**
  _Cohesion score 0.0693815987933635 - nodes in this community are weakly interconnected._
- **Should `Auth Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._