import ProductDetailPage from "@/components/Products/detail"

export default function Product() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <ProductDetailPage />
      </main>
    </div>
  )
}

