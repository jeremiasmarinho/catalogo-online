"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Headphones,
  Home,
  Instagram,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { STORE_CONFIG } from "@/config/store";
import { formatPrice } from "@/lib/format";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number | null;
  imageUrl: string | null;
  category: Category | null;
};
type CartLine = { product: Product; quantity: number };

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((response) => response.json()),
      fetch("/api/categories").then((response) => response.json()),
    ])
      .then(([productData, categoryData]) => {
        setProducts(productData);
        setCategories(categoryData);
      })
      .catch(() => setError("Não foi possível carregar o catálogo. Tente novamente."))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryMatches = categoryFilter === "all" || product.category?.id === categoryFilter;
        const query = search.trim().toLocaleLowerCase(STORE_CONFIG.locale);
        const searchMatches =
          !query ||
          product.name.toLocaleLowerCase(STORE_CONFIG.locale).includes(query) ||
          product.description.toLocaleLowerCase(STORE_CONFIG.locale).includes(query);
        return categoryMatches && searchMatches;
      }),
    [products, categoryFilter, search],
  );

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  function updateQuantity(product: Product, change: number) {
    setCart((current) => {
      const found = current.find((line) => line.product.id === product.id);
      const limit = product.stock ?? Number.POSITIVE_INFINITY;
      if (!found && change > 0) return [...current, { product, quantity: 1 }];
      return current
        .map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: Math.min(line.quantity + change, limit) }
            : line,
        )
        .filter((line) => line.quantity > 0);
    });
  }

  function quantityFor(productId: string) {
    return cart.find((line) => line.product.id === productId)?.quantity ?? 0;
  }

  function goToCatalogSearch() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("catalogo")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    window.setTimeout(() => document.getElementById("catalog-search")?.focus(), reduceMotion ? 0 : 350);
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          notes,
          items: cart.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível criar o pedido.");
      window.location.assign(data.whatsappUrl);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Não foi possível concluir o pedido.",
      );
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface">
      <header className="glass sticky top-0 z-30">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <a href="#inicio" className="flex items-center" aria-label={`${STORE_CONFIG.name}, início`}>
            <BrandLogo compact />
          </a>
          <form
            role="search"
            aria-label="Buscar no catálogo"
            onSubmit={(event) => {
              event.preventDefault();
              goToCatalogSearch();
            }}
            className="hidden h-10 max-w-[250px] flex-1 items-center gap-2 rounded-full border border-canvas bg-surface px-4 text-forest focus-within:border-forest lg:flex"
          >
            <Search size={16} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produtos"
              aria-label="Buscar produtos"
              className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-forest"
            />
          </form>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink md:flex lg:gap-7" aria-label="Navegação principal">
            <a href="#inicio" className="transition-colors hover:text-forest">Início</a>
            <a href="#catalogo" className="transition-colors hover:text-forest">Catálogo</a>
            <a href="#sobre" className="transition-colors hover:text-forest">Sobre Nós</a>
            <a
              href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-forest"
            >
              Contato
            </a>
            <a href="/admin" className="transition-colors hover:text-forest">Área do lojista</a>
          </nav>
          <button
            type="button"
            onClick={goToCatalogSearch}
            aria-label="Buscar produtos"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-canvas text-forest transition-colors hover:bg-canvas lg:hidden"
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="action-compact relative shrink-0"
            aria-label={`Abrir sacola, ${cartCount} ${cartCount === 1 ? "item" : "itens"}`}
          >
            <ShoppingBag size={17} />
            <span className="hidden sm:inline">Sacola</span>
            {cartCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-surface px-1 text-[11px] font-bold text-forest">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <section id="inicio" className="bg-canvas">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-forest">
              <span className="h-1.5 w-1.5 rounded-full bg-action" />
              {STORE_CONFIG.heroEyebrow}
            </span>
            <h1 className="mt-5 max-w-2xl font-display text-[38px] font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[56px]">
              {STORE_CONFIG.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink">
              {STORE_CONFIG.heroDescription}
            </p>
            <a href="#catalogo" className="action-primary mt-8 w-full sm:w-fit">
              {STORE_CONFIG.heroCta} <ArrowRight size={18} />
            </a>
          </div>
          <div className="relative min-h-[280px] overflow-hidden rounded-[28px] bg-surface sm:min-h-[380px] lg:min-h-[440px]">
            {STORE_CONFIG.heroImage ? (
              <Image src={STORE_CONFIG.heroImage} alt="" fill priority className="object-cover" />
            ) : (
              <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-canvas sm:h-80 sm:w-80" />
                <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-canvas" />
                <div className="absolute left-[20%] top-[12%] h-[74%] w-[58%] rotate-[-8deg] rounded-[42%] bg-canvas shadow-soft" />
                <div className="absolute left-[32%] top-[28%] h-[42%] w-[34%] rotate-[7deg] rounded-[42%] bg-action" />
                <div className="absolute bottom-[14%] right-[12%] h-24 w-24 rounded-full border-[14px] border-canvas" />
                <div className="absolute left-[8%] top-[12%] rounded-2xl bg-surface/90 p-3 text-forest shadow-soft backdrop-blur">
                  <PackageCheck size={20} />
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 rounded-2xl bg-surface/90 px-4 py-3 shadow-soft backdrop-blur-xl sm:bottom-6 sm:left-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-forest">Para sua loja</p>
              <p className="mt-1 text-sm font-semibold text-ink">Óculos, armações e perfumes</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Diferenciais" className="border-y border-canvas bg-surface">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-8">
          <Advantage icon={PackageCheck} title="Óculos e armações" description="Encontre opções para compor o mix da sua loja." />
          <Advantage icon={Headphones} title="Perfumes" description="Consulte as opções disponíveis em nosso catálogo." />
          <Advantage icon={MessageCircle} title="Atendimento pelo WhatsApp" description="Fale com nossa equipe sobre produtos e pedidos." />
        </div>
      </section>

      <section id="catalogo" className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-forest">ESCOLHA COM CALMA</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Nosso catálogo
              </h2>
              <p className="mt-2 text-sm text-ink">Produtos disponíveis para pedido.</p>
            </div>
            <label className="flex h-11 w-full items-center gap-2.5 rounded-full border border-canvas bg-surface px-4 text-forest focus-within:border-forest sm:max-w-[270px]">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Buscar produtos</span>
              <input
                id="catalog-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar produtos"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-forest"
              />
            </label>
          </div>

          <div className="hide-scrollbar mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por categoria">
            <FilterChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
              Todos
            </FilterChip>
            {categories.map((category) => (
              <FilterChip
                key={category.id}
                active={categoryFilter === category.id}
                onClick={() => setCategoryFilter(category.id)}
              >
                {category.name}
              </FilterChip>
            ))}
          </div>

          {error && !checkoutOpen && <Alert message={error} />}

          {loading ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[.88] rounded-2xl bg-canvas" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-canvas" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-canvas" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length ? (
            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-4">
              {filteredProducts.map((product, index) => (
                <article key={product.id} className="surface-card group min-w-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="relative block aspect-[.88] w-full overflow-hidden bg-canvas text-left"
                    aria-label={`Ver detalhes de ${product.name}`}
                  >
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 48vw, (max-width: 1024px) 30vw, 23vw"
                        className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.04]"
                      />
                    ) : (
                      <ProductPlaceholder index={index} />
                    )}
                    {product.category && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-surface/90 px-2.5 py-1 text-[9px] font-semibold text-forest backdrop-blur sm:left-3 sm:top-3 sm:text-[10px]">
                        {product.category.name}
                      </span>
                    )}
                  </button>
                  <div className="p-3 sm:p-4">
                    <button type="button" onClick={() => setSelectedProduct(product)} className="block w-full text-left">
                      <h3 className="truncate text-[13px] font-semibold text-ink sm:text-sm">{product.name}</h3>
                      <p className="mt-1 line-clamp-1 text-[11px] text-forest sm:text-xs">
                        {product.description || "Consulte os detalhes com nossa equipe."}
                      </p>
                    </button>
                    <StockLabel stock={product.stock} />
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink sm:text-base">
                        {formatPrice(product.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product, 1)}
                        disabled={product.stock === 0 || quantityFor(product.id) >= (product.stock ?? Infinity)}
                        aria-label={`Adicionar ${product.name} à sacola`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-surface transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-canvas disabled:text-forest"
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <ShoppingBag className="mx-auto text-forest" size={28} aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-bold text-ink">
                Ainda não há produtos por aqui
              </h3>
              <p className="mt-1 text-sm text-forest">
                {products.length ? "Experimente outra busca ou categoria." : "Em breve teremos novidades."}
              </p>
            </div>
          )}
        </div>
      </section>

      <section id="sobre" className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-8 sm:pb-16">
          <div className="grid gap-7 rounded-[26px] bg-canvas p-6 sm:px-10 sm:py-9 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-forest">SOBRE NÓS</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
                Sobre a Shopomega Brasil
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink">
                A Shopomega Brasil é uma distribuidora de óculos, armações e perfumes. Reunimos
                opções para lojistas que desejam ampliar o mix de produtos. Explore o catálogo e
                consulte nossa equipe sobre disponibilidade e condições de pedido.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-forest">
                Nossa equipe atende pelo WhatsApp para esclarecer dúvidas sobre os produtos e
                orientar você no pedido.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="action-compact w-full sm:w-fit"
              >
                Fale pelo WhatsApp <ArrowRight size={16} />
              </a>
              <a href="#catalogo" className="action-primary w-full sm:w-fit">
                {STORE_CONFIG.heroCta} <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-ink pb-20 sm:pb-0">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <BrandLogo inverse />
          <div className="flex flex-col gap-2 text-xs text-surface sm:items-end">
            <span>© {new Date().getFullYear()} {STORE_CONFIG.name}. Todos os direitos reservados.</span>
            <div className="flex flex-wrap gap-4">
              <a href={STORE_CONFIG.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 underline underline-offset-4">
                <Instagram size={14} aria-hidden="true" /> Instagram
              </a>
              <a href="/admin" className="w-fit underline underline-offset-4">Acesso do lojista</a>
              <a href="https://koraforce.com.br" target="_blank" rel="noreferrer" className="w-fit underline underline-offset-4">
                Desenvolvido por KoraForce
              </a>
            </div>
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => event.target === event.currentTarget && setSelectedProduct(null)}
        >
          <div className="relative w-full max-w-2xl overflow-hidden rounded-t-[26px] bg-surface/95 shadow-soft backdrop-blur-xl sm:rounded-[26px]">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              aria-label="Fechar detalhes do produto"
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-surface text-forest shadow-soft"
            >
              <X size={18} />
            </button>
            <div className="grid sm:grid-cols-2">
              <div className="relative aspect-square bg-canvas">
                {selectedProduct.imageUrl ? (
                  <Image
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <ProductPlaceholder index={1} />
                )}
              </div>
              <div className="safe-bottom flex flex-col p-5 sm:p-7">
                {selectedProduct.category && (
                  <p className="text-xs font-semibold text-forest">{selectedProduct.category.name}</p>
                )}
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
                  {selectedProduct.name}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-ink">
                  {selectedProduct.description || "Consulte os detalhes com nossa equipe."}
                </p>
                <StockLabel stock={selectedProduct.stock} />
                <p className="mt-4 text-xl font-bold text-ink">{formatPrice(selectedProduct.price)}</p>
                <button
                  type="button"
                  onClick={() => {
                    updateQuantity(selectedProduct, 1);
                    setSelectedProduct(null);
                    setCartOpen(true);
                  }}
                  disabled={selectedProduct.stock === 0}
                  className="action-compact mt-4 w-full disabled:cursor-not-allowed disabled:bg-canvas disabled:text-forest"
                >
                  <ShoppingCart size={17} /> Adicionar à sacola
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"
          onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}
        >
          <aside
            aria-label="Sua sacola"
            className="safe-bottom absolute bottom-0 right-0 flex h-[92dvh] w-full max-w-[440px] flex-col rounded-t-[26px] bg-surface/95 shadow-soft backdrop-blur-xl sm:top-0 sm:h-full sm:rounded-none sm:rounded-l-[26px]"
          >
            <div className="flex items-center justify-between border-b border-canvas px-5 py-5">
              <div>
                <p className="font-display text-lg font-bold text-ink">Sua sacola</p>
                <p className="mt-0.5 text-xs text-forest">
                  {cartCount} {cartCount === 1 ? "item" : "itens"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Fechar sacola"
                className="grid h-10 w-10 place-items-center rounded-full bg-canvas text-forest"
              >
                <X size={18} />
              </button>
            </div>
            <div className="hide-scrollbar flex-1 overflow-y-auto px-5">
              {cart.length ? (
                cart.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-3 border-b border-canvas py-4">
                    <div className="relative h-[76px] w-[70px] shrink-0 overflow-hidden rounded-xl bg-canvas">
                      {product.imageUrl ? (
                        <Image src={product.imageUrl} alt={product.name} fill sizes="70px" className="object-cover" />
                      ) : (
                        <ProductPlaceholder index={0} />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                      <div className="flex justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-ink">{product.name}</p>
                        <p className="shrink-0 text-sm font-semibold text-ink">
                          {formatPrice(product.price * quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product, -1)}
                          aria-label={`Diminuir quantidade de ${product.name}`}
                          className="grid h-8 w-8 place-items-center rounded-full border border-canvas text-forest"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-5 text-center text-xs font-semibold text-ink">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product, 1)}
                          disabled={product.stock !== null && quantity >= product.stock}
                          aria-label={`Aumentar quantidade de ${product.name}`}
                          className="grid h-8 w-8 place-items-center rounded-full border border-canvas text-forest disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-canvas text-forest">
                    <ShoppingBag size={24} />
                  </span>
                  <p className="mt-4 font-display font-bold text-ink">Sua sacola está vazia</p>
                  <p className="mt-1 text-sm text-forest">Adicione algo que você gostou.</p>
                  <button
                    type="button"
                    onClick={() => setCartOpen(false)}
                    className="mt-5 text-sm font-semibold text-forest underline underline-offset-4"
                  >
                    Voltar ao catálogo
                  </button>
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-canvas px-5 pt-4">
                <div className="flex justify-between text-sm text-forest">
                  <span>Subtotal</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="mt-2 flex justify-between text-base font-bold text-ink">
                  <span>Total</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(true);
                  }}
                  className="action-compact mt-4 w-full"
                >
                  Continuar para o pedido <ArrowRight size={16} />
                </button>
                <p className="pb-2 pt-2 text-center text-[11px] text-forest">
                  O pedido é registrado e a conversa segue pelo WhatsApp.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => event.target === event.currentTarget && setCheckoutOpen(false)}
        >
          <div className="safe-bottom w-full max-w-md rounded-t-[26px] bg-surface/95 p-5 shadow-soft backdrop-blur-xl sm:rounded-[26px] sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold text-ink">Quase lá!</p>
                <p className="mt-1 text-sm text-forest">Preencha seus dados para enviar o pedido.</p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Fechar pedido"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-forest"
              >
                <X size={18} />
              </button>
            </div>
            <div className="my-5 rounded-2xl bg-canvas p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-forest">
                <ShoppingBag size={14} /> RESUMO DO PEDIDO
              </div>
              <p className="mt-2 text-sm text-ink">
                {cartCount} {cartCount === 1 ? "item" : "itens"}{" "}
                <span className="float-right font-bold">{formatPrice(cartTotal)}</span>
              </p>
            </div>
            <form onSubmit={submitOrder} className="space-y-3">
              <label className="block text-xs font-semibold text-ink">
                Seu nome
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="field mt-1.5"
                  placeholder="Como podemos te chamar?"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                WhatsApp
                <input
                  required
                  minLength={8}
                  maxLength={24}
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  className="field mt-1.5"
                  placeholder="(11) 99999-9999"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Observações <span className="font-normal text-forest">(opcional)</span>
                <textarea
                  maxLength={500}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="field mt-1.5 min-h-[72px] resize-none py-2"
                  placeholder="Algum detalhe para o seu pedido?"
                />
              </label>
              {error && <Alert message={error} />}
              <button disabled={sending || !cart.length} className="action-compact w-full disabled:cursor-not-allowed disabled:bg-canvas disabled:text-forest">
                {sending ? "Preparando pedido..." : <><Check size={17} /> Enviar pedido pelo WhatsApp</>}
              </button>
              <p className="text-center text-[11px] text-forest">
                O valor dos itens é recalculado no servidor ao registrar o pedido.
              </p>
            </form>
          </div>
        </div>
      )}

      <nav aria-label="Navegação da loja" className="safe-bottom glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 px-2 pt-2 backdrop-blur-xl sm:hidden">
        <a href="#inicio" className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-forest">
          <Home size={18} aria-hidden="true" /> Início
        </a>
        <a href="#catalogo" className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-forest">
          <Search size={18} aria-hidden="true" /> Catálogo
        </a>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-forest"
        >
          <ShoppingBag size={18} aria-hidden="true" /> Sacola
          {cartCount > 0 && <span className="sr-only">{cartCount} {cartCount === 1 ? "item" : "itens"}</span>}
        </button>
        <a
          href={`https://wa.me/${STORE_CONFIG.whatsappNumber}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-forest"
        >
          <MessageCircle size={18} aria-hidden="true" /> Contato
        </a>
      </nav>

      <button
        type="button"
        aria-label="Voltar ao topo"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-20 right-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-forest text-surface shadow-soft sm:bottom-4"
      >
        <ChevronDown size={17} className="rotate-180" />
      </button>
    </main>
  );
}

function Advantage({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Check;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-forest">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-forest">{description}</p>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors ${
        active ? "bg-forest text-surface" : "border border-canvas bg-surface text-forest hover:bg-canvas"
      }`}
    >
      {children}
    </button>
  );
}

function StockLabel({ stock }: { stock: number | null }) {
  if (stock === null) {
    return <p className="mt-2 flex items-center gap-1.5 text-[11px] text-forest">Sob consulta</p>;
  }
  if (stock === 0) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-ink">
        <AlertCircle size={13} aria-hidden="true" /> Sem estoque
      </p>
    );
  }
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-forest">
      <Check size={13} aria-hidden="true" />
      {stock <= 3 ? `Últimas ${stock} unidades` : "Disponível"}
    </p>
  );
}

function Alert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-6 flex items-start gap-2 rounded-xl border border-canvas bg-canvas px-4 py-3 text-sm text-ink"
    >
      <AlertCircle size={17} className="shrink-0 text-forest" aria-hidden="true" />
      {message}
    </p>
  );
}

function ProductPlaceholder({ index }: { index: number }) {
  const positions = [
    "left-[8%] top-[14%] h-[26%] w-[26%]",
    "bottom-[10%] right-[10%] h-[30%] w-[30%]",
    "left-[12%] bottom-[14%] h-[22%] w-[22%]",
    "right-[12%] top-[16%] h-[28%] w-[28%]",
  ];
  return (
    <div className="absolute inset-0 grid place-items-center bg-canvas" aria-hidden="true">
      <div className="relative h-[58%] w-[45%] rounded-[45%_45%_18%_18%] bg-surface shadow-soft">
        <div className="absolute left-1/2 top-[18%] h-[48%] w-[62%] -translate-x-1/2 rounded-[45%_45%_15%_15%] bg-action" />
      </div>
      <span className={`absolute rounded-full border-[6px] border-surface ${positions[index % positions.length]}`} />
    </div>
  );
}
