import { Heart, Mail, Phone, Instagram } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Favorite Things</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover your favorite things with our curated collection of premium products.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#hero" className="hover:text-primary transition-colors">Home</a></li>
              <li><a href="#about" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Contact & Follow Us */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contact & Follow Us</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>support@favoritethingslifestyle.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+234 809 990 0228</span>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Instagram className="h-4 w-4" />
                <a href="#" className="hover:text-primary transition-colors">Follow us on Instagram</a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2014-2024 Favorite Things. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}