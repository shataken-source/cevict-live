import { NextRequest, NextResponse } from "next/server";
import { addKey, deleteKey, loadKeys } from "../../../keys-store";

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const keys = loadKeys().map(({ id, label, createdAt }) => ({ id, label, createdAt }));
    return NextResponse.json({
      success: true,
      keys
    });
  } catch (error: any) {
    console.error('❌ Error loading keys:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load keys',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, value } = body || {};

    if (!value) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Key value is required'
        },
        { status: 400 }
      );
    }

    const key = addKey(label, value);
    return NextResponse.json({
      success: true,
      key: { id: key.id, label: key.label, createdAt: key.createdAt }
    });
  } catch (error: any) {
    console.error('❌ Error adding key:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add key',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body || {};

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Key ID is required'
        },
        { status: 400 }
      );
    }

    const ok = deleteKey(id);
    if (ok) {
      return NextResponse.json({
        success: true,
        message: 'Key deleted successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: 'Key not found'
        },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error deleting key:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete key',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

