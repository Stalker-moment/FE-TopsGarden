import ProductsPage from "@/components/Products"

export default function Product() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <ProductsPage />
      </main>
    </div>
  )
}

