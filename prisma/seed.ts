import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  AccountType,
  CategoryScope,
  CategoryType,
  PrismaClient,
  TransactionType,
} from "../src/generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

/// bcrypt hash của mật khẩu "password123" — chỉ dùng cho dữ liệu mẫu môi trường dev.
const DEMO_PASSWORD_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

const SYSTEM_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}[] = [
  { name: "Ăn uống", icon: "🍜", color: "#F97316", type: CategoryType.EXPENSE },
  { name: "Di chuyển", icon: "🚕", color: "#0EA5E9", type: CategoryType.EXPENSE },
  { name: "Hóa đơn", icon: "🧾", color: "#EF4444", type: CategoryType.EXPENSE },
  { name: "Giải trí", icon: "🎬", color: "#A855F7", type: CategoryType.EXPENSE },
  { name: "Mua sắm", icon: "🛍️", color: "#EC4899", type: CategoryType.EXPENSE },
  { name: "Sức khỏe", icon: "💊", color: "#14B8A6", type: CategoryType.EXPENSE },
  { name: "Khác", icon: "📦", color: "#6B7280", type: CategoryType.EXPENSE },
  { name: "Lương", icon: "💰", color: "#22C55E", type: CategoryType.INCOME },
  { name: "Thưởng", icon: "🎁", color: "#EAB308", type: CategoryType.INCOME },
  { name: "Đầu tư", icon: "📈", color: "#3B82F6", type: CategoryType.INCOME },
  { name: "Thu nhập khác", icon: "🪙", color: "#6B7280", type: CategoryType.INCOME },
];

async function seedSystemCategories() {
  for (const category of SYSTEM_CATEGORIES) {
    // Không dùng upsert vì unique key (userId, name, type) có userId = NULL,
    // MySQL không so khớp NULL trong unique index.
    const existing = await prisma.category.findFirst({
      where: {
        scope: CategoryScope.SYSTEM,
        name: category.name,
        type: category.type,
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.category.create({
        data: { ...category, scope: CategoryScope.SYSTEM, userId: null },
      });
    }
  }

  return prisma.category.count({ where: { scope: CategoryScope.SYSTEM } });
}

const CURRENCIES: {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
  region: string;
  sortOrder: number;
}[] = [
  { code: "VND", name: "Việt Nam Đồng", symbol: "đ", decimalDigits: 0, region: "VN", sortOrder: 1 },
  { code: "USD", name: "US Dollar", symbol: "$", decimalDigits: 2, region: "US", sortOrder: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimalDigits: 2, region: "EU", sortOrder: 3 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimalDigits: 0, region: "JP", sortOrder: 4 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", decimalDigits: 0, region: "KR", sortOrder: 5 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimalDigits: 2, region: "CN", sortOrder: 6 },
  { code: "GBP", name: "British Pound", symbol: "£", decimalDigits: 2, region: "GB", sortOrder: 7 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimalDigits: 2, region: "AU", sortOrder: 8 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimalDigits: 2, region: "SG", sortOrder: 9 },
  { code: "THB", name: "Thai Baht", symbol: "฿", decimalDigits: 2, region: "TH", sortOrder: 10 },
];

/// Số VND đổi được từ 1 đơn vị tiền tệ tương ứng. Tỷ giá tham khảo cho môi trường dev.
const VND_PER_UNIT: Record<string, string> = {
  VND: "1",
  USD: "25400",
  EUR: "27600",
  JPY: "172",
  KRW: "18.5",
  CNY: "3520",
  GBP: "32300",
  AUD: "16700",
  SGD: "18900",
  THB: "710",
};

async function seedCurrencies() {
  for (const currency of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: currency,
      create: currency,
    });
  }

  return prisma.currency.count();
}

/// Seed hai chiều cho base = VND và base = USD. Các cặp còn lại được service
/// suy ra bắc cầu qua VND, không cần lưu đủ n² dòng.
async function seedExchangeRates() {
  const rates: { base: string; code: string; rate: string }[] = [];

  for (const [code, vndPerUnit] of Object.entries(VND_PER_UNIT)) {
    if (code === "VND") continue;
    rates.push({ base: "VND", code, rate: vndPerUnit });
    // 1 VND đổi được bao nhiêu đơn vị `code` — nghịch đảo, giữ 8 chữ số thập phân.
    rates.push({ base: code, code: "VND", rate: (1 / Number(vndPerUnit)).toFixed(8) });
  }

  const usdPerVnd = 1 / Number(VND_PER_UNIT.USD);
  for (const [code, vndPerUnit] of Object.entries(VND_PER_UNIT)) {
    if (code === "USD") continue;
    rates.push({ base: "USD", code, rate: (Number(vndPerUnit) * usdPerVnd).toFixed(8) });
  }

  for (const rate of rates) {
    await prisma.exchangeRate.upsert({
      where: { base_code: { base: rate.base, code: rate.code } },
      update: { rate: rate.rate },
      create: rate,
    });
  }

  return prisma.exchangeRate.count();
}

/// Đồng bộ lại cache `currentBalance` theo đúng công thức ở `account.service.ts`.
async function syncAccountBalances(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, isDeleted: false },
    select: { id: true, initialBalance: true },
  });

  for (const account of accounts) {
    const [inFrom, outFrom, inTo] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          isDeleted: false,
          fromAccountId: account.id,
          type: { in: [TransactionType.INCOME, TransactionType.BORROW] },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          isDeleted: false,
          fromAccountId: account.id,
          type: {
            in: [
              TransactionType.EXPENSE,
              TransactionType.LEND,
              TransactionType.TRANSFER,
            ],
          },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          isDeleted: false,
          toAccountId: account.id,
          type: TransactionType.TRANSFER,
        },
        select: { amount: true, receiveAmount: true },
      }),
    ]);

    const received = inTo.reduce(
      (total, tx) => total.add(tx.receiveAmount ?? tx.amount),
      account.initialBalance.minus(account.initialBalance)
    );

    const currentBalance = account.initialBalance
      .add(inFrom._sum.amount ?? 0)
      .add(received)
      .minus(outFrom._sum.amount ?? 0);

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance },
    });
  }
}

async function main() {
  const systemCategoryCount = await seedSystemCategories();
  const currencyCount = await seedCurrencies();
  const exchangeRateCount = await seedExchangeRates();

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Người dùng Demo",
      passwordHash: DEMO_PASSWORD_HASH,
      defaultCurrency: "VND",
    },
  });

  const accountSeeds: {
    name: string;
    type: AccountType;
    initialBalance: string;
    icon: string;
    isDefault: boolean;
  }[] = [
    {
      name: "Tiền mặt",
      type: AccountType.CASH,
      initialBalance: "2000000",
      icon: "👛",
      isDefault: true,
    },
    {
      name: "Vietcombank",
      type: AccountType.BANK_ACCOUNT,
      initialBalance: "15000000",
      icon: "🏦",
      isDefault: false,
    },
    {
      name: "Momo",
      type: AccountType.E_WALLET,
      initialBalance: "500000",
      icon: "📱",
      isDefault: false,
    },
  ];

  const accounts = await Promise.all(
    accountSeeds.map((account) =>
      prisma.account.upsert({
        where: { userId_name: { userId: user.id, name: account.name } },
        update: {},
        create: { ...account, userId: user.id, currency: "VND" },
      })
    )
  );

  const accountByName = (name: string) =>
    accounts.find((a) => a.name === name)!;

  const contactSeeds = [
    { name: "Nguyễn Văn A", phone: "0901234567", email: "vana@example.com" },
    { name: "Trần Thị B", phone: "0912345678", email: "thib@example.com" },
  ];

  const contacts = await Promise.all(
    contactSeeds.map((contact) =>
      prisma.contact.upsert({
        where: { userId_name: { userId: user.id, name: contact.name } },
        update: {},
        create: { ...contact, userId: user.id },
      })
    )
  );

  const contactByName = (name: string) => contacts.find((c) => c.name === name)!;

  const categoryByName = async (name: string, type: CategoryType) => {
    const category = await prisma.category.findFirst({
      where: { scope: CategoryScope.SYSTEM, name, type },
      select: { id: true },
    });
    return category!.id;
  };

  let transactionCount = await prisma.transaction.count({
    where: { userId: user.id },
  });

  if (transactionCount === 0) {
    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          type: TransactionType.INCOME,
          amount: "20000000",
          date: new Date("2026-08-01"),
          note: "Lương tháng 8",
          fromAccountId: accountByName("Vietcombank").id,
          categoryId: await categoryByName("Lương", CategoryType.INCOME),
        },
        {
          userId: user.id,
          type: TransactionType.EXPENSE,
          amount: "45000",
          date: new Date("2026-08-02"),
          note: "Ăn trưa",
          fromAccountId: accountByName("Tiền mặt").id,
          categoryId: await categoryByName("Ăn uống", CategoryType.EXPENSE),
        },
        {
          userId: user.id,
          type: TransactionType.EXPENSE,
          amount: "550000",
          date: new Date("2026-08-05"),
          note: "Tiền điện tháng 7",
          fromAccountId: accountByName("Vietcombank").id,
          categoryId: await categoryByName("Hóa đơn", CategoryType.EXPENSE),
        },
        {
          userId: user.id,
          type: TransactionType.TRANSFER,
          amount: "1000000",
          date: new Date("2026-08-06"),
          note: "Rút tiền về ví Momo",
          fromAccountId: accountByName("Vietcombank").id,
          toAccountId: accountByName("Momo").id,
        },
        {
          userId: user.id,
          type: TransactionType.LEND,
          amount: "3000000",
          date: new Date("2026-08-08"),
          note: "Cho A mượn tiền",
          fromAccountId: accountByName("Vietcombank").id,
          contactId: contactByName("Nguyễn Văn A").id,
        },
        {
          userId: user.id,
          type: TransactionType.BORROW,
          amount: "1500000",
          date: new Date("2026-08-10"),
          note: "Mượn tiền B",
          fromAccountId: accountByName("Tiền mặt").id,
          contactId: contactByName("Trần Thị B").id,
        },
      ],
    });

    transactionCount = await prisma.transaction.count({
      where: { userId: user.id },
    });
  }

  await syncAccountBalances(user.id);

  console.log("Seed hoàn tất:");
  console.log(`  - user: 1 (${user.email})`);
  console.log(`  - category (SYSTEM): ${systemCategoryCount}`);
  console.log(`  - currency: ${currencyCount}`);
  console.log(`  - exchange rate: ${exchangeRateCount}`);
  console.log(`  - account: ${accounts.length}`);
  console.log(`  - contact: ${contacts.length}`);
  console.log(`  - transaction: ${transactionCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
