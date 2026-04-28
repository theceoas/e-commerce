import { Heart, Mail, Phone, Instagram } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">FT</span>
              </div>
              <span className="text-xl font-bold text-white">Favorite Things</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Curated Nigerian fashion brands, made with intention.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#hero" className="text-gray-400 hover:text-yellow-400 transition-colors">Home</a></li>
              <li><a href="#about" className="text-gray-400 hover:text-yellow-400 transition-colors">About</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-yellow-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Contact & Follow Us */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">Get in Touch</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2 text-gray-400">
                <Mail className="h-4 w-4 text-yellow-400 shrink-0" />
                <span>support@favoritethingslifestyle.com</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Phone className="h-4 w-4 text-yellow-400 shrink-0" />
                <span>+234 809 990 0228</span>
              </div>
              <div className="flex items-center space-x-2">
                <Instagram className="h-4 w-4 text-yellow-400 shrink-0" />
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">Follow us on Instagram</a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-600">
          <p>&copy; 2014-2025 Favorite Things. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}