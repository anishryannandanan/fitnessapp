import { Body, Controller, Get, Headers, HttpCode, Post, RawBody } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { CreatePaymentOrderDto } from './dto/create-order.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('payment-gateway')
export class PaymentGatewayController {
  constructor(private readonly service: PaymentGatewayService) {}

  /** Create a Razorpay order for member online payment. */
  @Roles('member', 'owner', 'manager', 'receptionist')
  @Post('create-order')
  createOrder(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentOrderDto) {
    return this.service.createOrder(user, dto);
  }

  /** Verify payment after Razorpay checkout (frontend callback). */
  @Post('verify')
  @HttpCode(200)
  verify(
    @Body()
    body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    return this.service.verifyPayment(body);
  }

  /** Razorpay webhook — public, secured by signature verification. */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = JSON.stringify(body);
    return this.service.handleWebhook(rawBody, signature ?? '');
  }

  /** Get member's online payment history. */
  @Roles('member')
  @Get('my-orders')
  myOrders(@CurrentUser() user: AuthUser) {
    return this.service.getMemberPaymentOrders(user);
  }
}
