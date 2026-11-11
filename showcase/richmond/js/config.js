/* =========================================================
   Richmond: site settings (the one file to edit)
   ========================================================= */
window.RICHMOND = {
  phone: '01 478 8783',
  tel: 'tel:+35314788783',
  email: 'eat@richmondrestaurant.ie',

  // 'demo'   = everything works, nothing is charged or stored (showcase)
  // 'stripe' = vouchers paid through checkout.php (needs the restaurant's own
  //            Stripe key in stripe-secret.php on the server, never in git)
  PAYMENTS_MODE: 'demo',
  CHECKOUT_ENDPOINT: 'checkout.php',

  booking: {
    maxGuests: 8,          // above this: "call us"
    daysAhead: 60,
    slotMinutes: 15,
    leadMinutes: 60,       // no bookings for less than an hour from now
    // Seatings per day (0 = Sunday). Times are first and last booking times.
    services: {
      0: [{ name: 'Sunday Lunch', from: '12:30', to: '14:00' }, { name: 'Sunday Dinner', from: '17:00', to: '20:00' }],
      1: [], 2: [],
      3: [{ name: 'Dinner', from: '17:30', to: '21:00' }],
      4: [{ name: 'Dinner', from: '17:30', to: '21:00' }],
      5: [{ name: 'Dinner', from: '17:30', to: '21:00' }],
      6: [{ name: 'Dinner', from: '17:30', to: '21:00' }]
    },
    earlyEveningUntil: '18:30'
  },

  vouchers: {
    amounts: [25, 50, 75, 100, 150, 200, 250],
    min: 25, max: 1000, maxQty: 10,
    experiences: [
      { id: 'early-evening-2', name: 'Early Evening for Two', desc: 'Three courses each from the Early Evening menu.', price: 110 },
      { id: 'sunday-lunch-2', name: 'Sunday Lunch for Two', desc: 'Three courses each, Sunday 12.30pm – 2.30pm.', price: 90 },
      { id: 'tasting-2', name: 'Tuesday Tasting for Two', desc: 'Five-course tasting menu on our next Tasting Tuesday.', price: 156 }
    ]
  },

  menus: {
    dinner: {
      title: 'Dinner', note: 'À la carte, all evening. Wednesday to Sunday.',
      sections: [
        ['Starters', [
          ['Pumpkin soup, goats’ cheese ravioli, hazelnut, truffle', '18'],
          ['Tuna tartare, kohlrabi, apple, tom yum, warm crumpet', '18.50'],
          ['Glazed pork cheek, anchovy, celeriac, spiced plum', '18.50']]],
        ['Mains', [
          ['Roast Wicklow venison loin, ragu tart, turnip, quince, blackberry, fondant potato', '39'],
          ['Autumn vegetables, mushroom & comté cheese pie, glazed carrot, peppercorn sauce', '29'],
          ['Market fish, changes regularly', ''],
          ['John Stone aged beef striploin, glazed ox tongue, scallion, green beans, café de Paris, chips', '42']]],
        ['Sides', [
          ['Pear, blue cheese, autumn leaves, chestnut / Chips / Red beets, smoked Gubbeen, crispy kale', '6']]],
        ['Desserts', [
          ['Chocolate crème brûlée, raspberry, shortbread biscuit', '12.50'],
          ['Date pudding, toffee sauce, salted peanuts, gingerbread ice cream', '12.50'],
          ['Grilled Irish cheese, crackers, chutney, honey', '13']]]
      ]
    },
    early: {
      title: 'Early Evening', note: 'Two courses €44 · Three courses €55. From 5.30pm to 6.30pm.',
      sections: [
        ['Starters', [['Pumpkin soup, goats’ cheese ravioli, hazelnut, truffle'], ['Tuna tartare, kohlrabi, apple, tom yum, warm crumpet'], ['Glazed pork cheek, anchovy, celeriac, spiced plum']]],
        ['Mains', [['Autumn vegetables, mushroom & comté cheese pie, glazed carrot, peppercorn sauce'], ['Grilled cod, spinach & caper chutney, bourguignon, tarragon potatoes'], ['Confit duck leg, turnip, quince, fondant potato, jus']]],
        ['Desserts', [['Chocolate crème brûlée, raspberry, shortbread biscuit'], ['Date pudding, toffee sauce, salted peanuts, gingerbread ice cream'], ['Grilled Irish cheese, crackers, chutney, honey']]]
      ]
    },
    lunch: {
      title: 'Sunday Lunch', note: 'Two courses €35 · Three courses €45. Sunday 12.30pm to 2.30pm. Children very welcome.',
      sections: [
        ['Starters', [['Goats’ cheese terrine, hazelnut, rye bread'], ['Cured salmon, kohlrabi, tom yum, warm crumpet'], ['Glazed pork cheeks, anchovy, celeriac, spiced plum']]],
        ['Mains', [['Autumn vegetables, mushroom & comté cheese pie, glazed carrot, peppercorn sauce'], ['Grilled cod, spinach & caper chutney, bourguignon, tarragon potatoes'], ['Confit duck leg, turnip, quince, fondant potato, jus']]],
        ['Dessert', [['Almond cake, salted caramel, chocolate, yoghurt ice cream'], ['Date pudding, toffee sauce, salted peanuts, gingerbread ice cream'], ['Grilled Irish cheese, crackers, chutney, honey']]]
      ]
    },
    tasting: {
      title: 'Tuesday Tasting', note: 'Five courses, €78 per person. Next date: Tuesday 2 February 2027. We can’t accommodate dietary or allergy requests on this menu.',
      sections: []
    }
  }
};
