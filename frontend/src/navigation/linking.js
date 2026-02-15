const linking = {
  prefixes: ['wilkenpoelker://', 'https://wilkenpoelker.de'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ResetPassword: 'reset-password/:token',
        },
      },
      Main: {
        screens: {
          Feed: {
            screens: {
              FeedHome: 'feed',
              PostDetail: 'feed/post/:postId',
            },
          },
          Products: {
            screens: {
              ProductTabs: {
                screens: {
                  Bikes: 'products/bikes',
                  Cleaning: 'products/cleaning',
                  Motor: 'products/motor',
                },
              },
              ProductDetail: 'products/:productId',
              ProductSearch: 'products/search',
              AIChat: 'products/ai-chat',
            },
          },
          Service: {
            screens: {
              ServiceHome: 'service',
              CreateTicket: 'service/create',
              TicketDetail: 'service/ticket/:ticketId',
              Chat: 'service/chat/:ticketId',
            },
          },
          Repairs: {
            screens: {
              RepairsList: 'repairs',
              RepairDetail: 'repairs/:repairId',
            },
          },
          More: {
            screens: {
              MoreMenu: 'more',
              AboutUs: 'about-us',
              Appointments: 'appointments',
              AppointmentDetail: 'appointments/:appointmentId',
              Notifications: 'notifications',
              Profile: 'profile',
              Settings: 'settings',
              Admin: 'admin',
              FAQManagement: 'admin/faq',
              Impressum: 'impressum',
              Datenschutz: 'datenschutz',
              AGB: 'agb',
              Widerrufsrecht: 'widerrufsrecht',
            },
          },
        },
      },
    },
  },
};

export default linking;
