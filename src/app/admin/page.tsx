"use client";

import Image from "next/image";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FolderPlus,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { compressImageInBrowser, validateImageFile } from "@/lib/client-image";
import { formatPrice } from "@/lib/format";

type Category = { id: string; name: string; _count?: { products: number } };
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number | null;
  imageUrl: string | null;
  active: boolean;
  category: Category | null;
};
type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  total: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  items: { id: string; name: string; unitPrice: number; quantity: number }[];
};
type Tab = "sales" | "products" | "categories";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("sales");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState({ count: 0, pending: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [processingImage, setProcessingImage] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const request = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const response = await fetch(url, {
        ...init,
        credentials: "same-origin",
        headers: {
          ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...init.headers,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) setAuthenticated(false);
        throw new Error(data.error ?? "Não foi possível concluir a operação.");
      }
      return data;
    },
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productData, categoryData, orderData] = await Promise.all([
        request("/api/products?all=true"),
        request("/api/categories"),
        request("/api/orders"),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      setOrders(orderData.orders);
      setSummary(orderData.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o painel.");
      if (loadError instanceof Error && loadError.message === "Não autorizado.") {
        setAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((data: { authenticated: boolean }) => {
        if (active) setAuthenticated(data.authenticated);
      })
      .catch(() => {
        if (active) setError("Não foi possível verificar a sessão.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authenticated) void Promise.resolve().then(loadData);
  }, [authenticated, loadData]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível entrar.");
      setPassword("");
      setAuthenticated(true);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    void fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
    setAuthenticated(false);
    setPassword("");
    setProducts([]);
    setOrders([]);
  }

  function resetProductForm() {
    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductStock("");
    setProductCategory("");
    setProductImage(null);
    setImageError("");
    setProcessingImage(false);
    setEditingProduct(null);
    setProductFormOpen(false);
  }

  function startProductEdit(product: Product) {
    setEditingProduct(product);
    setProductName(product.name);
    setProductDescription(product.description);
    setProductPrice((product.price / 100).toFixed(2));
    setProductStock(product.stock === null ? "" : String(product.stock));
    setProductCategory(product.category?.id ?? "");
    setProductImage(null);
    setImageError("");
    setProcessingImage(false);
    setProductFormOpen(true);
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageError("");
    if (!file) {
      setProductImage(null);
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setProductImage(null);
      event.target.value = "";
      setImageError(validationError);
      return;
    }

    setProcessingImage(true);
    try {
      const compressed = await compressImageInBrowser(file);
      const postValidation = validateImageFile(compressed);
      if (postValidation) {
        setProductImage(null);
        setImageError(postValidation);
        event.target.value = "";
        return;
      }
      setProductImage(compressed);
    } catch {
      setProductImage(file);
    } finally {
      setProcessingImage(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || processingImage || imageError) return;
    setBusy(true);
    setError("");
    setNotice("");

    if (productImage) {
      const validationError = validateImageFile(productImage);
      if (validationError) {
        setImageError(validationError);
        setBusy(false);
        return;
      }
    }

    const formData = new FormData();
    formData.set("name", productName);
    formData.set("description", productDescription);
    formData.set("price", String(Math.round(Number(productPrice.replace(",", ".")) * 100)));
    formData.set("stock", productStock);
    if (productCategory) formData.set("categoryId", productCategory);
    try {
      if (productImage) {
        const blob = await upload(`pending/${crypto.randomUUID()}`, productImage, {
          access: "private",
          handleUploadUrl: "/api/upload",
          contentType: productImage.type,
        });
        formData.set("imageKey", blob.pathname);
      }
      if (editingProduct) {
        formData.set("id", editingProduct.id);
        await request("/api/products", { method: "PATCH", body: formData });
        setNotice("Produto atualizado.");
      } else {
        await request("/api/products", { method: "POST", body: formData });
        setNotice("Produto adicionado ao catálogo.");
      }
      resetProductForm();
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o produto.");
    } finally {
      setBusy(false);
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryName }),
      });
      setCategoryName("");
      setNotice("Categoria criada.");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível criar a categoria.");
    } finally {
      setBusy(false);
    }
  }

  async function changeProductStatus(product: Product) {
    setError("");
    try {
      await request("/api/products", {
        method: "PATCH",
        body: JSON.stringify({ id: product.id, active: !product.active }),
      });
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Não foi possível atualizar o produto.");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir "${product.name}" permanentemente?`)) return;
    setError("");
    try {
      await request("/api/products", {
        method: "DELETE",
        body: JSON.stringify({ id: product.id }),
      });
      setNotice("Produto excluído.");
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir o produto.");
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Excluir a categoria "${category.name}"? Os produtos ficarão sem categoria.`)) return;
    setError("");
    try {
      await request("/api/categories", {
        method: "DELETE",
        body: JSON.stringify({ id: category.id }),
      });
      setNotice("Categoria excluída.");
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir a categoria.");
    }
  }

  async function changeOrderStatus(order: Order, status: Order["status"]) {
    setError("");
    try {
      await request("/api/orders", {
        method: "PATCH",
        body: JSON.stringify({ id: order.id, status }),
      });
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Não foi possível atualizar o pedido.");
    }
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-[410px] rounded-[26px] border border-canvas bg-surface p-7 shadow-soft sm:p-9">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-forest hover:text-ink">
            <ArrowLeft size={15} /> Voltar à loja
          </Link>
          <div className="mt-8">
            <BrandLogo />
          </div>
          <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-forest text-surface">
            <ShieldCheck size={23} />
          </div>
          <p className="mt-6 text-[10px] font-bold tracking-[0.16em] text-forest">ÁREA RESTRITA</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
            Painel do lojista
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink">
            Entre com a senha de administrador para gerenciar a loja.
          </p>
          <form onSubmit={login} className="mt-6 space-y-3">
            <label htmlFor="admin-password" className="text-xs font-semibold text-ink">
              Senha de administrador
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field h-12"
              placeholder="Pelo menos 12 caracteres"
            />
            {error && <PanelAlert message={error} />}
            <button disabled={busy} className="action-compact w-full disabled:cursor-not-allowed disabled:bg-canvas disabled:text-forest">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : "Entrar no painel"}
            </button>
          </form>
          <p className="mt-5 text-center text-[10px] leading-5 text-forest">
            Configure <code className="rounded bg-canvas px-1">ADMIN_PASSWORD</code> no ambiente do servidor.
          </p>
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
    { id: "sales", label: "Vendas", icon: ClipboardList },
    { id: "products", label: "Produtos", icon: Package },
    { id: "categories", label: "Categorias", icon: LayoutDashboard },
  ];

  return (
    <main className="min-h-screen bg-canvas">
      <header className="glass sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <BrandLogo compact />
            <span className="hidden border-l border-canvas pl-3 text-xs font-semibold text-forest sm:block">
              Painel do lojista
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-full px-3 py-2 text-xs font-medium text-forest hover:bg-canvas sm:block">
              Ver loja
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-forest hover:bg-canvas"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 pb-28 sm:px-8 sm:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-forest">BEM-VINDO(A) DE VOLTA</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Visão geral
            </h1>
            <p className="mt-1 text-sm text-ink">Acompanhe sua loja e mantenha tudo em ordem.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="w-fit rounded-full border border-canvas bg-surface px-4 py-2.5 text-xs font-semibold text-forest hover:bg-canvas"
          >
            Atualizar dados
          </button>
        </div>

        {error && <div className="mt-5"><PanelAlert message={error} /></div>}
        {notice && (
          <div
            role="status"
            className="mt-5 flex items-center justify-between rounded-xl border border-canvas bg-surface px-4 py-3 text-sm text-ink"
          >
            <span className="flex items-center gap-2"><Check size={16} className="text-forest" />{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Fechar aviso">
              <X size={15} />
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MetricCard label="Vendas registradas" value={String(summary.count)} icon={ClipboardList} />
          <MetricCard label="Aguardando confirmação" value={String(summary.pending)} icon={Clock3} />
          <div className="col-span-2 lg:col-span-1">
            <MetricCard label="Total em pedidos ativos" value={formatPrice(summary.revenue)} icon={CircleDollarSign} />
          </div>
        </div>

        <div className="hide-scrollbar mt-7 hidden gap-1 overflow-x-auto border-b border-canvas sm:flex">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                tab === id ? "border-forest text-forest" : "border-transparent text-forest hover:text-ink"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center text-sm text-forest">
            <LoaderCircle size={18} className="mr-2 animate-spin" /> Carregando painel...
          </div>
        ) : tab === "sales" ? (
          <section className="mt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Pedidos recentes</h2>
                <p className="mt-1 text-xs text-forest">Atualize o status conforme avança o atendimento.</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-forest">
                {orders.length} pedidos
              </span>
            </div>
            {orders.length ? (
              <div className="space-y-3">
                {orders.map((order) => <OrderCard key={order.id} order={order} onStatusChange={changeOrderStatus} />)}
              </div>
            ) : (
              <EmptyState title="Nenhuma venda ainda" description="Os pedidos realizados pelos clientes aparecerão aqui." />
            )}
          </section>
        ) : tab === "products" ? (
          <section className="mt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Seus produtos</h2>
                <p className="mt-1 text-xs text-forest">Cadastre produtos e controle o que aparece na vitrine.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (productFormOpen) resetProductForm();
                  else {
                    setEditingProduct(null);
                    setProductName("");
                    setProductDescription("");
                    setProductPrice("");
                    setProductStock("");
                    setProductCategory("");
                    setProductImage(null);
                    setImageError("");
                    setProcessingImage(false);
                    setProductFormOpen(true);
                  }
                }}
                className="action-compact shrink-0 !text-xs"
              >
                {productFormOpen ? <X size={15} /> : <Plus size={15} />}
                {productFormOpen ? "Fechar" : "Novo produto"}
              </button>
            </div>

            {productFormOpen && (
              <form onSubmit={saveProduct} className="mb-5 rounded-2xl border border-canvas bg-surface p-4 sm:p-6">
                <h3 className="font-display font-bold text-ink">
                  {editingProduct ? "Editar produto" : "Adicionar produto"}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-ink">
                    Nome do produto
                    <input required maxLength={120} value={productName} onChange={(event) => setProductName(event.target.value)} className="field mt-1.5" />
                  </label>
                  <label className="text-xs font-semibold text-ink">
                    Preço (R$)
                    <input required type="number" min="0" step="0.01" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} className="field mt-1.5" placeholder="0,00" />
                  </label>
                  <label className="text-xs font-semibold text-ink sm:col-span-2">
                    Descrição
                    <textarea maxLength={1000} value={productDescription} onChange={(event) => setProductDescription(event.target.value)} className="field mt-1.5 min-h-20 resize-none py-2" />
                  </label>
                  <label className="text-xs font-semibold text-ink">
                    Estoque <span className="font-normal text-forest">(vazio = sem controle)</span>
                    <input type="number" min="0" step="1" inputMode="numeric" value={productStock} onChange={(event) => setProductStock(event.target.value)} className="field mt-1.5" placeholder="Ex.: 10" />
                  </label>
                  <label className="text-xs font-semibold text-ink">
                    Categoria
                    <select value={productCategory} onChange={(event) => setProductCategory(event.target.value)} className="field mt-1.5">
                      <option value="">Sem categoria</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-ink sm:col-span-2">
                    Imagem{" "}
                    <span className="font-normal text-forest">
                      (JPG, PNG, WEBP ou GIF · original até 20 MB · salvo otimizado até 1 MB)
                    </span>
                    <span className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-canvas px-3 text-sm font-normal text-forest">
                      <Upload size={15} />
                      <span className="min-w-0 flex-1 truncate">
                        {processingImage
                          ? "Otimizando imagem..."
                          : (productImage?.name ?? (editingProduct?.imageUrl ? "Manter imagem atual" : "Escolher arquivo"))}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={processingImage}
                        onChange={(event) => void handleImageChange(event)}
                      />
                    </span>
                    {imageError && (
                      <span role="alert" className="mt-1.5 block text-xs font-normal text-red-700">
                        {imageError}
                      </span>
                    )}
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <button disabled={busy || processingImage || Boolean(imageError)} className="action-compact flex-1 !text-xs disabled:cursor-not-allowed disabled:bg-canvas disabled:text-forest sm:flex-none">
                    {busy || processingImage ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={15} />}
                    {editingProduct ? "Salvar alterações" : "Salvar produto"}
                  </button>
                  {editingProduct && (
                    <button type="button" onClick={resetProductForm} className="h-11 rounded-full border border-canvas px-5 text-xs font-semibold text-forest">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            )}

            {products.length ? (
              <div className="space-y-3">
                {products.map((product) => (
                  <article key={product.id} className="surface-card p-3 sm:flex sm:items-center sm:gap-4 sm:p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-canvas text-forest">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt="" width={56} height={56} className="h-full w-full object-cover" />
                        ) : (
                          <Package size={18} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                        <p className="mt-1 truncate text-xs text-forest">
                          {product.category?.name ?? "Sem categoria"} · {formatPrice(product.price)}
                        </p>
                        <p className={`mt-1 flex items-center gap-1 text-xs text-forest ${product.stock === 0 ? "font-bold text-ink" : ""}`}>
                          <Boxes size={13} aria-hidden="true" />
                          {product.stock === null
                            ? "Estoque sem controle"
                            : product.stock === 0
                              ? "Sem estoque"
                              : `${product.stock} em estoque`}
                        </p>
                      </div>
                      <StatusBadge
                        icon={product.active ? Check : Ban}
                        label={product.active ? "Ativo" : "Inativo"}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-0 sm:flex sm:shrink-0">
                      <button type="button" onClick={() => startProductEdit(product)} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-canvas px-2 text-xs font-semibold text-ink hover:bg-canvas sm:px-3">
                        <Pencil size={14} /> Editar
                      </button>
                      <button type="button" onClick={() => void changeProductStatus(product)} className="h-10 rounded-xl border border-canvas px-2 text-xs font-semibold text-forest hover:bg-canvas sm:px-3">
                        {product.active ? "Desativar" : "Ativar"}
                      </button>
                      <button type="button" onClick={() => void deleteProduct(product)} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-canvas px-2 text-xs font-semibold text-forest hover:bg-canvas sm:px-3">
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="Seu catálogo está vazio" description="Adicione o primeiro produto para começar." />
            )}
          </section>
        ) : (
          <section className="mt-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-bold text-ink">Categorias</h2>
              <p className="mt-1 text-xs text-forest">Organize seus produtos para facilitar a busca.</p>
            </div>
            <form onSubmit={createCategory} className="flex gap-2 rounded-2xl border border-canvas bg-surface p-3">
              <label className="sr-only" htmlFor="new-category">Nome da categoria</label>
              <input id="new-category" required maxLength={60} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ex.: Novidades" className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-forest" />
              <button disabled={busy} className="action-compact !text-xs disabled:cursor-not-allowed disabled:bg-canvas disabled:text-forest">
                <FolderPlus size={15} /> Criar
              </button>
            </form>
            {categories.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-canvas bg-surface">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center gap-3 border-b border-canvas px-4 py-3.5 last:border-0">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-canvas text-forest">
                      <LayoutDashboard size={16} />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{category.name}</p>
                    <span className="text-xs text-forest">{category._count?.products ?? 0} produtos</span>
                    <button type="button" onClick={() => void deleteCategory(category)} aria-label={`Excluir categoria ${category.name}`} className="grid h-9 w-9 place-items-center rounded-full text-forest hover:bg-canvas">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState title="Nenhuma categoria criada" description="Você pode cadastrar produtos sem categoria ou criar uma acima." />
              </div>
            )}
          </section>
        )}
      </div>

      <nav aria-label="Navegação do painel" className="safe-bottom glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 px-2 pt-2 backdrop-blur-xl sm:hidden">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${
              tab === id ? "bg-canvas text-forest" : "text-forest"
            }`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
    </main>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ClipboardList }) {
  return (
    <div className="surface-card p-4 sm:p-5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-canvas text-forest"><Icon size={17} aria-hidden="true" /></span>
      <p className="mt-4 truncate font-display text-lg font-bold tracking-tight text-ink sm:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-forest sm:text-xs">{label}</p>
    </div>
  );
}

function StatusBadge({ icon: Icon, label }: { icon: typeof Check; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold text-forest">
      <Icon size={12} aria-hidden="true" /> {label}
    </span>
  );
}

function PanelAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-canvas bg-canvas px-4 py-3 text-sm text-ink">
      <AlertCircle size={17} className="shrink-0 text-forest" aria-hidden="true" />
      {message}
    </p>
  );
}

function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (order: Order, status: Order["status"]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusLabels: Record<Order["status"], string> = {
    PENDING: "Pendente",
    CONFIRMED: "Confirmado",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
  };
  const statusIcons: Record<Order["status"], typeof Clock3> = {
    PENDING: Clock3,
    CONFIRMED: Check,
    COMPLETED: PackageCheck,
    CANCELLED: Ban,
  };

  return (
    <article className="surface-card overflow-hidden">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center gap-3 p-4 text-left sm:px-5" aria-expanded={expanded}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-forest">
          <ClipboardList size={17} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{order.customerName}</span>
          <span className="mt-1 block text-[10px] text-forest">
            {new Date(order.createdAt).toLocaleString("pt-BR")} · #{order.id.slice(-8).toUpperCase()}
          </span>
        </span>
        <span className="hidden text-right sm:block">
          <span className="block text-sm font-semibold text-ink">{formatPrice(order.total)}</span>
          <span className="mt-1 block text-[10px] text-forest">{order.items.length} itens</span>
        </span>
        <StatusBadge icon={statusIcons[order.status]} label={statusLabels[order.status]} />
        <ChevronDown size={16} className={`shrink-0 text-forest transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {expanded && (
        <div className="border-t border-canvas bg-surface px-4 py-4 sm:px-5">
          <div className="flex flex-wrap justify-between gap-2 text-xs">
            <span className="text-forest">WhatsApp</span>
            <a href={`https://wa.me/${order.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="font-semibold text-forest underline underline-offset-4">
              {order.customerPhone}
            </a>
          </div>
          <div className="mt-3 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-xs">
                <span className="text-forest">{item.quantity}× {item.name}</span>
                <span className="font-medium text-ink">{formatPrice(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>
          {order.notes && <p className="mt-3 rounded-lg bg-canvas p-3 text-xs text-ink">Observações: {order.notes}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-canvas pt-3">
            <p className="text-sm font-bold text-ink sm:hidden">Total: {formatPrice(order.total)}</p>
            <label className="flex items-center gap-2 text-xs font-semibold text-ink">
              Status
              <select value={order.status} onChange={(event) => void onStatusChange(order, event.target.value as Order["status"])} className="h-10 rounded-lg border border-canvas bg-surface px-2 text-xs font-medium text-ink outline-none focus:border-forest">
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        </div>
      )}
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-canvas bg-surface px-5 py-12 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-canvas text-forest">
        <Package size={19} aria-hidden="true" />
      </span>
      <h3 className="mt-3 font-display text-sm font-bold text-ink">{title}</h3>
      <p className="mt-1 text-xs text-forest">{description}</p>
    </div>
  );
}
