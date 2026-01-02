'use client'

export default function Affiliates() {
  const products = {
    cbd: [
      {name: 'CBDistillery', link: 'YOUR_AFFILIATE_LINK', price: '$29.99', image: '??'},
      {name: 'Charlotte\'s Web', link: 'YOUR_AFFILIATE_LINK', price: '$39.99', image: '??'},
      {name: 'Lazarus Naturals', link: 'YOUR_AFFILIATE_LINK', price: '$24.99', image: '??'},
    ],
    vapes: [
      {name: 'VaporDNA Starter Kit', link: 'YOUR_AFFILIATE_LINK', price: '$49.99', image: '??'},
      {name: 'Element Vape Pod System', link: 'YOUR_AFFILIATE_LINK', price: '$34.99', image: '??'},
      {name: 'DirectVapor Mod', link: 'YOUR_AFFILIATE_LINK', price: '$79.99', image: '??'},
    ],
    papers: [
      {name: 'RAW Classic Papers', link: 'YOUR_AFFILIATE_LINK', price: '$2.99', image: '??'},
      {name: 'Smoke Cartel Bundle', link: 'YOUR_AFFILIATE_LINK', price: '$19.99', image: '??'},
      {name: 'Grasscity Grinder', link: 'YOUR_AFFILIATE_LINK', price: '$14.99', image: '??'},
    ],
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Smoker-Approved Products</h1>
      
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">?? CBD Products</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {products.cbd.map(p => (
            <a key={p.name} href={p.link} target="_blank" className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition">
              <div className="text-6xl mb-4">{p.image}</div>
              <h3 className="text-xl font-bold mb-2">{p.name}</h3>
              <div className="text-2xl text-green-400 mb-4">{p.price}</div>
              <button className="w-full bg-green-600 hover:bg-green-500 py-2 rounded">View Deal</button>
            </a>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">?? Vapes & E-Cigs</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {products.vapes.map(p => (
            <a key={p.name} href={p.link} target="_blank" className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition">
              <div className="text-6xl mb-4">{p.image}</div>
              <h3 className="text-xl font-bold mb-2">{p.name}</h3>
              <div className="text-2xl text-blue-400 mb-4">{p.price}</div>
              <button className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded">View Deal</button>
            </a>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">?? Rolling Papers & Accessories</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {products.papers.map(p => (
            <a key={p.name} href={p.link} target="_blank" className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition">
              <div className="text-6xl mb-4">{p.image}</div>
              <h3 className="text-xl font-bold mb-2">{p.name}</h3>
              <div className="text-2xl text-purple-400 mb-4">{p.price}</div>
              <button className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded">View Deal</button>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
